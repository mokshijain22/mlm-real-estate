const mongoose = require('mongoose');
const { isOnlineMode } = require('../utils/paymentModes');
const Rank = require('../models/Rank');
const User = require('../models/User');
const settingService = require('./settingService');
const walletService = require('./walletService');
const rankService = require('./rankService');
const treeBuilderService = require('./treeBuilderService');

/**
 * Company's per-sqft share = Project's commissionPool minus the CAP already
 * assigned to the top-of-chain executive above this selling agent (the same
 * "Own" figure already computed by treeBuilderService.getCompanyTree()).
 * Preview-only — no wallet is credited for this.
 */
async function getCompanyRatePerSqft(sellingAgent, commissionPool) {
  const pool = Number(commissionPool) || 0;
  if (pool <= 0) return 0;

  const uplineChain = await treeBuilderService.getUplineChain(sellingAgent);
  const uplineIds = Object.values(uplineChain);
  const topLevelAgent = uplineIds.length > 0
    ? await User.findById(uplineIds[uplineIds.length - 1])
    : sellingAgent;

  const topLevelCap = Number(topLevelAgent?.slabPerSqft) || 0;
  return Math.max(pool - topLevelCap, 0);
}

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
      const sellerRate = cap > 0 ? cap : sellerPoints * multiplier;
      const sellerEarning = sqftPortion * sellerRate;
      let previousCap = cap > 0 ? cap : sellerRate;

      await walletService.credit(
        sellingAgent,
        sellerEarning,
        pointsType,
        'emi_commission',
        `EMI Commission - ${booking.bookingNumber} - Month ${emi.emiNumber}`,
        booking._id,
        emi._id,
        null,
        session,
        sqftPortion
      );

      // 2. Traverse upline chain for rank-difference commission
      const uplineChain = await treeBuilderService.getUplineChain(sellingAgent);
      const uplineCaps = booking.uplineCommissionCapsPerSqft || [];
      let previousRankPoints = sellerPoints;
      let uplineRowIndex = 0;

      for (const [level, uplineId] of Object.entries(uplineChain)) {
        const uplineAgent = await User.findById(uplineId).populate('rank').session(session);
        if (!uplineAgent) continue;

        const uplinePoints = await rankService.getAgentRankPoints(uplineAgent, pointsType);
        const difference = uplinePoints - previousRankPoints;

        if (difference > 0) {
          const rawCommission = sqftPortion * difference * multiplier;
          const uplineCap = Number(uplineCaps[uplineRowIndex]) || 0;
          const uplineRate = uplineCap > 0 ? Math.max(uplineCap - previousCap, 0) : difference * multiplier;
          const commission = sqftPortion * uplineRate;
          previousCap = uplineCap > 0 ? Math.max(uplineCap, previousCap) : previousCap;

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
          uplineRowIndex++;
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
      const sellerRate = cap > 0 ? cap : sellerPoints * multiplier;
      const sellerEarning = combinedSqft * sellerRate;
      let previousCap = cap > 0 ? cap : sellerRate;

      await walletService.credit(
        sellingAgent,
        sellerEarning,
        pointsType,
        'emi_commission',
        `Booking Deposit + Down Payment Commission - ${booking.bookingNumber}`,
        booking._id,
        downPaymentEmi._id,
        null,
        session,
        combinedSqft
      );

      const uplineChain = await treeBuilderService.getUplineChain(sellingAgent);
      const uplineCaps = booking.uplineCommissionCapsPerSqft || [];
      let previousRankPoints = sellerPoints;
      let uplineRowIndex = 0;

      for (const [level, uplineId] of Object.entries(uplineChain)) {
        const uplineAgent = await User.findById(uplineId).populate('rank').session(session);
        if (!uplineAgent) continue;

        const uplinePoints = await rankService.getAgentRankPoints(uplineAgent, pointsType);
        const difference = uplinePoints - previousRankPoints;

        if (difference > 0) {
          const rawCommission = combinedSqft * difference * multiplier;
          const uplineCap = Number(uplineCaps[uplineRowIndex]) || 0;
          const uplineRate = uplineCap > 0 ? Math.max(uplineCap - previousCap, 0) : difference * multiplier;
          const commission = combinedSqft * uplineRate;
          previousCap = uplineCap > 0 ? Math.max(uplineCap, previousCap) : previousCap;

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
          uplineRowIndex++;
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
async function previewCommissionForData({
  agentId,
  agentRankId,
  pricePerSqft,
  emiAmount,
  emiMonths,
  paymentMode,
  commissionPool,
  companyRateOverride,
  sellerCapPerSqft = 0,
  uplineCapsPerSqft = [],
}) {
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
  const rawSellerRatePerSqft = sellerPoints * multiplier;
  const sellerRatePerSqft = sellerCapPerSqft > 0 ? sellerCapPerSqft : rawSellerRatePerSqft;
  const sellerCommissionPerEmi = sqftPortion * sellerRatePerSqft;
  let previousCap = sellerCapPerSqft > 0 ? sellerCapPerSqft : sellerRatePerSqft;

  preview.push({
    agent_name: sellingAgent.name,
    rank: bookingRank?.name || 'B.EX',
    role: 'Selling Agent',
    points_per_sf: sellerPoints,
    commission_per_emi: sellerCommissionPerEmi,
    total_commission: sellerCommissionPerEmi * emiMonths,
    default_cap_per_sqft: sellingAgent.slabPerSqft ?? 0,
    note: `Seller rank at booking time: ${bookingRank?.name || 'N/A'}`,
  });

  const uplineChain = await treeBuilderService.getUplineChain(sellingAgent);
  let previousRankPoints = sellerPoints;
  // Sum of what seller + upline actually earn, per sqft — Company's share is
  // whatever's left of the pool after this, not a disconnected formula.
  let paidRatePerSqft = sellerRatePerSqft;
  let uplineRowIndex = 0;

  for (const [level, uplineId] of Object.entries(uplineChain)) {
    const uplineAgent = await User.findById(uplineId).populate('rank');
    if (!uplineAgent) continue;

    const uplinePoints = await rankService.getAgentRankPoints(uplineAgent, pointsType);
    const difference = uplinePoints - previousRankPoints;

    if (difference > 0) {
      const rawUplineRatePerSqft = difference * multiplier;
      const uplineCap = Number(uplineCapsPerSqft[uplineRowIndex]) || 0;
      const uplineRatePerSqft = uplineCap > 0 ? Math.max(uplineCap - previousCap, 0) : rawUplineRatePerSqft;
      const commissionPerEmi = sqftPortion * uplineRatePerSqft;
      previousCap = uplineCap > 0 ? Math.max(uplineCap, previousCap) : previousCap;

      preview.push({
        agent_name: uplineAgent.name,
        rank: uplineAgent.rank?.name || 'B.EX',
        role: `Upline (${level})`,
        points_per_sf: difference,
        commission_per_emi: commissionPerEmi,
        total_commission: commissionPerEmi * emiMonths,
        default_cap_per_sqft: uplineAgent.slabPerSqft ?? 0,
      });

      paidRatePerSqft += uplineRatePerSqft;
      previousRankPoints = uplinePoints;
      uplineRowIndex++;
    }
  }

  // A saved booking passes its snapshotted rate (companyRateOverride); the
  // live wizard preview (before a booking exists) computes it fresh — Project
  // pool minus what seller + upline actually earn, a true leftover.
  const companyRate =
    companyRateOverride != null
      ? Number(companyRateOverride)
      : Math.max((Number(commissionPool) || 0) - paidRatePerSqft, 0);
  if (companyRate > 0) {
    preview.push({
      agent_name: 'Company',
      rank: null,
      role: 'Company',
      points_per_sf: companyRate,
      commission_per_emi: sqftPortion * companyRate,
      total_commission: sqftPortion * companyRate * emiMonths,
      note: 'Company share (Project pool minus what seller + upline actually earn)',
      isCompany: true,
    });
  }

  return preview;
}

/**
 * Preview commission for the one-time Booking Deposit + Down Payment portion
 * (no wallet writes). Mirrors what processCombinedDepositCommission() actually pays.
 */
async function previewDepositCommissionForData({ agentId, agentRankId, pricePerSqft, depositSqft, paymentMode, commissionPool, companyRateOverride }) {
  const sellingAgent = await User.findById(agentId);
  if (!sellingAgent || depositSqft <= 0) return [];

  const preview = [];
  const pointsType = isOnlineMode(paymentMode) ? 'BV' : 'PV';
  const multiplier = await settingService.get(`${pointsType.toLowerCase()}_per_sqft`, 1.0);

  let bookingRank = agentRankId ? await Rank.findById(agentRankId) : null;
  if (!bookingRank) {
    bookingRank = sellingAgent.rank ? await Rank.findById(sellingAgent.rank) : null;
  }
  if (!bookingRank) {
    bookingRank = await Rank.findOne().sort({ sortOrder: 1 });
  }

  const sellerPoints = pointsType === 'BV' ? Number(bookingRank?.bvPoints || 0) : Number(bookingRank?.pvPoints || 0);
  preview.push({ agent_name: sellingAgent.name, commission: depositSqft * sellerPoints * multiplier });

  const uplineChain = await treeBuilderService.getUplineChain(sellingAgent);
  let previousRankPoints = sellerPoints;

  for (const [level, uplineId] of Object.entries(uplineChain)) {
    const uplineAgent = await User.findById(uplineId).populate('rank');
    if (!uplineAgent) continue;

    const uplinePoints = await rankService.getAgentRankPoints(uplineAgent, pointsType);
    const difference = uplinePoints - previousRankPoints;

    if (difference > 0) {
      preview.push({ agent_name: uplineAgent.name, commission: depositSqft * difference * multiplier });
      previousRankPoints = uplinePoints;
    }
  }

  const companyRate = companyRateOverride != null ? Number(companyRateOverride) : await getCompanyRatePerSqft(sellingAgent, commissionPool);
  if (companyRate > 0) {
    preview.push({ agent_name: 'Company', commission: depositSqft * companyRate, isCompany: true });
  }

  return preview;
}

/**
 * Preview commission distribution for an already-saved booking (no wallet writes).
 */
async function previewCommission(booking) {
  await booking.populate('agent');
  await booking.populate('agentRank');

  if (!booking.agent) {
    return { rows: [], summary: null };
  }

  const pricePerSqft = Number(booking.pricePerSqft) || 0;
  // Use the rate snapshotted at booking-creation time, not today's live Project
  // pool — a saved booking's commission must never shift when rates change later.
  const companyRateSnapshot = Number(booking.companyRatePerSqft) || 0;

  const emiRows = await previewCommissionForData({
    agentId: booking.agent._id,
    agentRankId: booking.agentRank?._id || null,
    pricePerSqft,
    emiAmount: booking.emiAmount,
    emiMonths: booking.emiMonths,
    paymentMode: booking.paymentMode,
    companyRateOverride: companyRateSnapshot,
  });

  // Booking Deposit + Down Payment are paid up front and their commission is
  // released together (see processCombinedDepositCommission) — separate from
  // the recurring per-EMI commission above.
  const depositAmount = Number(booking.bookingAmount || 0) + Number(booking.downPaymentAmount || 0);
  const depositSqft = pricePerSqft > 0 ? depositAmount / pricePerSqft : 0;

  const depositRows = await previewDepositCommissionForData({
    agentId: booking.agent._id,
    agentRankId: booking.agentRank?._id || null,
    pricePerSqft,
    depositSqft,
    paymentMode: booking.paymentMode,
    companyRateOverride: companyRateSnapshot,
  });
  const depositMap = new Map(depositRows.map((d) => [d.agent_name, d.commission]));

  const rows = emiRows.map((row) => {
    const depositCommission = depositMap.get(row.agent_name) || 0;
    return {
      ...row,
      deposit_commission: depositCommission,
      grand_total: depositCommission + row.total_commission,
    };
  });

  const totalDepositCommission = depositRows.reduce((s, d) => s + d.commission, 0);
  const totalEmiCommission = emiRows.reduce((s, r) => s + r.total_commission, 0);

  return {
    rows,
    summary: {
      totalBookingAmount: Number(booking.totalAmount) || 0,
      bookingDepositAmount: depositAmount,
      totalDepositCommission,
      totalEmiCommission,
      grandTotalCommission: totalDepositCommission + totalEmiCommission,
    },
  };
}

module.exports = {
  processEmiCommission,
  processCombinedDepositCommission,
  previewCommission,
  previewCommissionForData,
  previewDepositCommissionForData,
  getCompanyRatePerSqft,
};