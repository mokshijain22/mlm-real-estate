const Rank = require('../models/Rank');
const User = require('../models/User');
const settingService = require('./settingService');
const walletService = require('./walletService');
const rankService = require('./rankService');
const treeBuilderService = require('./treeBuilderService');

/**
 * Process commission for a paid EMI. Mirrors CommissionService::processEmiCommission.
 */
async function processEmiCommission(emi) {
  if (emi.commissionProcessed) return;

  const Booking = require('../models/Booking');
  const booking = await Booking.findById(emi.booking).populate('agent').populate('agentRank');
  const sellingAgent = booking.agent;
  const mode = emi.paymentMode || booking.paymentMode;
  const sqftPortion = Number(emi.sqftPortion);

  const pointsType = mode.toUpperCase() === 'ONLINE' ? 'BV' : 'PV';
  const multiplier = await settingService.get(`${pointsType.toLowerCase()}_per_sqft`, 1.0);

  // 1. Seller commission based on snapshot rank at booking time
  let bookingRank = booking.agentRank;
  if (!bookingRank) {
    bookingRank = await Rank.findOne().sort({ sortOrder: 1 });
  }

  const sellerPoints = pointsType === 'BV' ? Number(bookingRank?.bvPoints || 0) : Number(bookingRank?.pvPoints || 0);
  const sellerEarning = sqftPortion * sellerPoints * multiplier;

  await walletService.credit(
    sellingAgent,
    sellerEarning,
    pointsType,
    'emi_commission',
    `EMI Commission - ${booking.bookingNumber} - Month ${emi.emiNumber}`,
    booking._id,
    emi._id
  );

  // 2. Traverse upline chain for rank-difference commission
  const uplineChain = await treeBuilderService.getUplineChain(sellingAgent);
  let previousRankPoints = sellerPoints;

  for (const [level, uplineId] of Object.entries(uplineChain)) {
    const uplineAgent = await User.findById(uplineId).populate('rank');
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
        emi._id
      );

      previousRankPoints = uplinePoints;
    }
  }

  // 3. Mark EMI as processed
  emi.commissionProcessed = true;
  await emi.save();

  // 4. Rank/stats refresh
  await rankService.checkAndUpgradeRank(sellingAgent);
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
  const booking = await Booking.findById(downPaymentEmi.booking).populate('agent').populate('agentRank');
  const sellingAgent = booking.agent;
  const mode = downPaymentEmi.paymentMode || booking.paymentMode;
  const combinedSqft = Number(downPaymentEmi.sqftPortion) + Number(depositEmi.sqftPortion);

  const pointsType = mode.toUpperCase() === 'ONLINE' ? 'BV' : 'PV';
  const multiplier = await settingService.get(`${pointsType.toLowerCase()}_per_sqft`, 1.0);

  let bookingRank = booking.agentRank;
  if (!bookingRank) {
    bookingRank = await Rank.findOne().sort({ sortOrder: 1 });
  }

  const sellerPoints = pointsType === 'BV' ? Number(bookingRank?.bvPoints || 0) : Number(bookingRank?.pvPoints || 0);
  const sellerEarning = combinedSqft * sellerPoints * multiplier;

  await walletService.credit(
    sellingAgent,
    sellerEarning,
    pointsType,
    'emi_commission',
    `Booking Deposit + Down Payment Commission - ${booking.bookingNumber}`,
    booking._id,
    downPaymentEmi._id
  );

  const uplineChain = await treeBuilderService.getUplineChain(sellingAgent);
  let previousRankPoints = sellerPoints;

  for (const [level, uplineId] of Object.entries(uplineChain)) {
    const uplineAgent = await User.findById(uplineId).populate('rank');
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
        downPaymentEmi._id
      );

      previousRankPoints = uplinePoints;
    }
  }

  downPaymentEmi.commissionProcessed = true;
  await downPaymentEmi.save();
  depositEmi.commissionProcessed = true;
  await depositEmi.save();

  await rankService.checkAndUpgradeRank(sellingAgent);
}

/**
 * Preview commission distribution for a booking (no wallet writes).
 */
async function previewCommission(booking) {
  await booking.populate('agent');
  await booking.populate('agentRank');

  const preview = [];
  const sellingAgent = booking.agent;
  const mode = booking.paymentMode;
  const sqftPortion = Number(booking.totalArea) / Number(booking.emiMonths);

  const pointsType = mode.toUpperCase() === 'ONLINE' ? 'BV' : 'PV';
  const multiplier = await settingService.get(`${pointsType.toLowerCase()}_per_sqft`, 1.0);

  let bookingRank = booking.agentRank;
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
    total_commission: sellerCommissionPerEmi * booking.emiMonths,
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
        total_commission: commissionPerEmi * booking.emiMonths,
      });

      previousRankPoints = uplinePoints;
    }
  }

  return preview;
}

module.exports = { processEmiCommission, processCombinedDepositCommission, previewCommission };