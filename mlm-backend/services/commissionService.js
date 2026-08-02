const mongoose = require('mongoose');
const { isOnlineMode } = require('../utils/paymentModes');
const Rank = require('../models/Rank');
const User = require('../models/User');
const settingService = require('./settingService');
const walletService = require('./walletService');
const rankService = require('./rankService');
const treeBuilderService = require('./treeBuilderService');

/**
 * Process commission for a paid EMI. Mirrors CommissionService::processEmiCommission.
 *
 * Wrapped in a single Mongo transaction (like Laravel's DB::transaction) so
 * the seller credit, every upline credit, and the commissionProcessed flag
 * either all commit or all roll back — otherwise a mid-loop failure could
 * leave some agents paid, commissionProcessed still false, and a retry would
 * double-pay whoever already got credited.
 */
async function processEmiCommission(emi) {
  if (emi.commissionProcessed) return;

  const Booking = require('../models/Booking');
  const session = await mongoose.startSession();
  let sellingAgentForRankRefresh;

  try {
    await session.withTransaction(async () => {
      const booking = await Booking.findById(emi.booking).populate('agent').populate('agentRank').session(session);
      const sellingAgent = booking.agent;
      if (!sellingAgent) {
        emi.commissionProcessed = true;
        await emi.save({ session });
        return;
      }
      sellingAgentForRankRefresh = sellingAgent;
      const mode = emi.paymentMode || booking.paymentMode;
       const sqftPortion = Number(emi.sqftPortion);

      const pointsType = isOnlineMode(mode) ? 'BV' : 'PV';
      const multiplier = await settingService.get(`${pointsType.toLowerCase()}_per_sqft`, 1.0);
      // 1. Seller commission based on snapshot rank at booking time
      let bookingRank = booking.agentRank;
      if (!bookingRank) {
        bookingRank = await Rank.findOne().sort({ sortOrder: 1 }).session(session);
      }

      const sellerPoints = pointsType === 'BV' ? Number(bookingRank?.bvPoints || 0) : Number(bookingRank?.pvPoints || 0);
      const cap = Number(booking.commissionCapPerSqft) || 0;
      const sellerEarning = cap > 0 ? Math.min(sqftPortion * sellerPoints * multiplier, sqftPortion * cap) : sqftPortion * sellerPoints * multiplier;

      await walletService.credit(
        sellingAgent,
        sellerEarning,
        pointsType,
        'emi_commission',
        `EMI Commission - ${booking.bookingNumber} - Month ${emi.emiNumber}`,
        booking._id,
        emi._id,
        null,
        session
      );

      // 2. Traverse upline chain for rank-difference commission
      const uplineChain = await treeBuilderService.getUplineChain(sellingAgent);
      let previousRankPoints = sellerPoints;

      for (const [level, uplineId] of Object.entries(uplineChain)) {
        const uplineAgent = await User.findById(uplineId).populate('rank').session(session);
        if (!uplineAgent) continue;

        const uplinePoints = await rankService.getAgentRankPoints(uplineAgent, pointsType);
        const difference = uplinePoints - previousRankPoints;

        if (difference > 0) {
          const commission = sqftPortion * difference * multiplier;

          await walletService.credit(
            uplineAgent,
            commission,
            pointsType,
            'rank_difference',
            `Rank Difference Commission - ${booking.bookingNumber} - Month ${emi.emiNumber} - From ${sellingAgent.name}`,
            booking._id,
            emi._id,
            null,
            session
          );

          previousRankPoints = uplinePoints;
        }
      }

      // 3. Mark EMI as processed
      emi.commissionProcessed = true;
      await emi.save({ session });
    });
  } finally {
    session.endSession();
  }

  // 4. Rank/stats refresh — outside the transaction (matches Laravel, which
  // runs this after the DB::transaction closure completes).
  if (sellingAgentForRankRefresh) {
    await rankService.checkAndUpgradeRank(sellingAgentForRankRefresh);
  }
}

/**
 * Release commission for the Booking Deposit and Down Payment TOGETHER, as a
 * single combined payout — used only once the Down Payment has actually been
 * received. The Deposit's commission is intentionally never released on its
 * own while a Down Payment is expected on the booking; it stays held until
 * this method runs. Mirrors CommissionService::processCombinedDepositCommission.
 */
async function processCombinedDepositCommission(downPaymentEmi, depositEmi) {
  if (downPaymentEmi.commissionProcessed && depositEmi.commissionProcessed) return;

  const Booking = require('../models/Booking');
  const session = await mongoose.startSession();
  let sellingAgentForRankRefresh;

  try {
    await session.withTransaction(async () => {
      const booking = await Booking.findById(downPaymentEmi.booking).populate('agent').populate('agentRank').session(session);
      const sellingAgent = booking.agent;
      if (!sellingAgent) {
        downPaymentEmi.commissionProcessed = true;
        await downPaymentEmi.save({ session });
        depositEmi.commissionProcessed = true;
        await depositEmi.save({ session });
        return;
      }
      sellingAgentForRankRefresh = sellingAgent;
      const mode = downPaymentEmi.paymentMode || booking.paymentMode;
    const combinedSqft = Number(downPaymentEmi.sqftPortion) + Number(depositEmi.sqftPortion);

      const pointsType = isOnlineMode(mode) ? 'BV' : 'PV';
      const multiplier = await settingService.get(`${pointsType.toLowerCase()}_per_sqft`, 1.0);
      let bookingRank = booking.agentRank;
      if (!bookingRank) {
        bookingRank = await Rank.findOne().sort({ sortOrder: 1 }).session(session);
      }

      const sellerPoints = pointsType === 'BV' ? Number(bookingRank?.bvPoints || 0) : Number(bookingRank?.pvPoints || 0);
      const cap = Number(booking.commissionCapPerSqft) || 0;
      const sellerEarning = cap > 0 ? Math.min(combinedSqft * sellerPoints * multiplier, combinedSqft * cap) : combinedSqft * sellerPoints * multiplier;

      await walletService.credit(
        sellingAgent,
        sellerEarning,
        pointsType,
        'emi_commission',
        `Booking Deposit + Down Payment Commission - ${booking.bookingNumber}`,
        booking._id,
        downPaymentEmi._id,
        null,
        session
      );

      const uplineChain = await treeBuilderService.getUplineChain(sellingAgent);
      let previousRankPoints = sellerPoints;

      for (const [level, uplineId] of Object.entries(uplineChain)) {
        const uplineAgent = await User.findById(uplineId).populate('rank').session(session);
        if (!uplineAgent) continue;

        const uplinePoints = await rankService.getAgentRankPoints(uplineAgent, pointsType);
        const difference = uplinePoints - previousRankPoints;

        if (difference > 0) {
          const commission = combinedSqft * difference * multiplier;

          await walletService.credit(
            uplineAgent,
            commission,
            pointsType,
            'rank_difference',
            `Rank Difference (Deposit + Down Payment) - ${booking.bookingNumber} - From ${sellingAgent.name}`,
            booking._id,
            downPaymentEmi._id,
            null,
            session
          );

          previousRankPoints = uplinePoints;
        }
      }

      downPaymentEmi.commissionProcessed = true;
      await downPaymentEmi.save({ session });
      depositEmi.commissionProcessed = true;
      await depositEmi.save({ session });
    });
  } finally {
    session.endSession();
  }

  if (sellingAgentForRankRefresh) {
    await rankService.checkAndUpgradeRank(sellingAgentForRankRefresh);
  }
}

/**
 * Preview commission distribution from raw inputs (no saved booking needed).
 * Used both by the booking wizard's Commission step (before the booking exists)
 * and by previewCommission() below (for an already-saved booking).
 */
async function previewCommissionForData({ agentId, agentRankId, pricePerSqft, emiAmount, emiMonths, paymentMode }) {
  const sellingAgent = await User.findById(agentId);
  if (!sellingAgent) throw new Error('Agent not found.');

  const preview = [];
  const mode = paymentMode;
  const sqftPortion = pricePerSqft > 0 ? Number(emiAmount) / pricePerSqft : 0;

  const pointsType = isOnlineMode(mode) ? 'BV' : 'PV';
  const multiplier = await settingService.get(`${pointsType.toLowerCase()}_per_sqft`, 1.0);

  let bookingRank = agentRankId ? await Rank.findById(agentRankId) : null;
  if (!bookingRank) {
    bookingRank = sellingAgent.rank ? await Rank.findById(sellingAgent.rank) : null;
  }
  if (!bookingRank) {
    bookingRank = await Rank.findOne().sort({ sortOrder: 1 });
  }

  const sellerPoints = pointsType === 'BV' ? Number(bookingRank?.bvPoints || 0) : Number(bookingRank?.pvPoints || 0);
  const sellerCommissionPerEmi = sqftPortion * sellerPoints * multiplier;

  preview.push({
    agent_name: sellingAgent.name,
    rank: bookingRank?.name || 'B.EX',
    role: 'Selling Agent',
    points_per_sf: sellerPoints,
    commission_per_emi: sellerCommissionPerEmi,
    total_commission: sellerCommissionPerEmi * emiMonths,
    note: `Seller rank at booking time: ${bookingRank?.name || 'N/A'}`,
  });

  const uplineChain = await treeBuilderService.getUplineChain(sellingAgent);
  let previousRankPoints = sellerPoints;

  for (const [level, uplineId] of Object.entries(uplineChain)) {
    const uplineAgent = await User.findById(uplineId).populate('rank');
    if (!uplineAgent) continue;

    const uplinePoints = await rankService.getAgentRankPoints(uplineAgent, pointsType);
    const difference = uplinePoints - previousRankPoints;

    if (difference > 0) {
      const commissionPerEmi = sqftPortion * difference * multiplier;

      preview.push({
        agent_name: uplineAgent.name,
        rank: uplineAgent.rank?.name || 'B.EX',
        role: `Upline (${level})`,
        points_per_sf: difference,
        commission_per_emi: commissionPerEmi,
        total_commission: commissionPerEmi * emiMonths,
      });

      previousRankPoints = uplinePoints;
    }
  }

  return preview;
}

/**
 * Preview commission distribution for an already-saved booking (no wallet writes).
 */
async function previewCommission(booking) {
  await booking.populate('agent');
  await booking.populate('agentRank');

  if (!booking.agent) return [];

  return previewCommissionForData({
    agentId: booking.agent._id,
    agentRankId: booking.agentRank?._id || null,
    pricePerSqft: Number(booking.pricePerSqft) || 0,
    emiAmount: booking.emiAmount,
    emiMonths: booking.emiMonths,
    paymentMode: booking.paymentMode,
  });
}

module.exports = { processEmiCommission, processCombinedDepositCommission, previewCommission, previewCommissionForData };