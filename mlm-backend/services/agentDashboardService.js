const Booking = require('../models/Booking');
const Emi = require('../models/Emi');
const Rank = require('../models/Rank');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const AgentWallet = require('../models/AgentWallet');
const { getDownlineByLevel } = require('./treeBuilderService');
const { getReferralLink } = require('../utils/userHelpers');

async function sumAmount(filter) {
  const result = await WalletTransaction.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result.length ? result[0].total : 0;
}

async function getWalletData(agent) {
  const wallet = await AgentWallet.findOne({ agent: agent._id });

  const totalBvEarned = await sumAmount({ agent: agent._id, type: 'credit', pointsType: 'BV' });
  const totalPvEarned = await sumAmount({ agent: agent._id, type: 'credit', pointsType: 'PV' });

  return {
    bvBalance: wallet ? wallet.bvBalance : 0,
    pvBalance: wallet ? wallet.pvBalance : 0,
    totalBvEarned,
    totalPvEarned,
  };
}

async function getRankData(agent) {
  const rank = agent.rank; // populated by auth middleware
  const nextRank = rank
    ? await Rank.findOne({ sortOrder: { $gt: rank.sortOrder } }).sort({ sortOrder: 1 })
    : null;

  const sqftProgressPercent =
    nextRank && nextRank.minGroupSales > 0
      ? Math.min(100, (agent.totalGroupSales / nextRank.minGroupSales) * 100)
      : 100;

  const teamProgressPercent =
    nextRank && nextRank.minTeamSize > 0
      ? Math.min(100, (agent.totalTeamSize / nextRank.minTeamSize) * 100)
      : 100;

  return {
    currentRank: rank,
    nextRank,
    totalGroupSales: agent.totalGroupSales,
    totalTeamSize: agent.totalTeamSize,
    sqftProgressPercent,
    teamProgressPercent,
  };
}

async function getBookingData(agent) {
  const [totalBookings, activeBookings, pendingBookings, completedBookings, recentBookings] = await Promise.all([
    Booking.countDocuments({ agent: agent._id }),
    Booking.countDocuments({ agent: agent._id, approvalStatus: 'approved', status: 'active' }),
    Booking.countDocuments({ agent: agent._id, approvalStatus: 'pending' }),
    Booking.countDocuments({ agent: agent._id, status: 'completed' }),
    Booking.find({ agent: agent._id })
      .populate('customer')
      .populate('plot')
      .populate('project')
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  return { totalBookings, activeBookings, pendingBookings, completedBookings, recentBookings };
}

async function getTeamData(agent) {
  const downlineByLevel = await getDownlineByLevel(agent);

  const teamPerLevel = {};
  for (const [level, ids] of Object.entries(downlineByLevel)) {
    teamPerLevel[level] = await User.countDocuments({ _id: { $in: ids }, isKycVerified: true });
  }

  const directReferrals = await User.countDocuments({ referredBy: agent._id, isKycVerified: true });

  return {
    totalTeam: agent.totalTeamSize,
    directReferrals,
    teamPerLevel,
  };
}

async function getCommissionData(agent) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const thisMonthBv = await sumAmount({
    agent: agent._id,
    type: 'credit',
    pointsType: 'BV',
    createdAt: { $gte: startOfMonth, $lt: startOfNextMonth },
  });
  const thisMonthPv = await sumAmount({
    agent: agent._id,
    type: 'credit',
    pointsType: 'PV',
    createdAt: { $gte: startOfMonth, $lt: startOfNextMonth },
  });

  const recentCommissions = await WalletTransaction.find({ agent: agent._id, type: 'credit' })
    .populate('booking')
    .sort({ createdAt: -1 })
    .limit(5);

  return { thisMonthBv, thisMonthPv, recentCommissions };
}

async function getEmiData(agent) {
  const agentBookingIds = await Booking.find({ agent: agent._id }).distinct('_id');

  const upcomingEmis = await Emi.find({
    booking: { $in: agentBookingIds },
    status: 'pending',
    dueDate: { $gte: new Date() },
  })
    .sort({ dueDate: 1 })
    .populate({ path: 'booking', populate: ['customer', 'plot'] })
    .limit(5);

  const overdueEmis = await Emi.countDocuments({ booking: { $in: agentBookingIds }, status: 'overdue' });

  return { upcomingEmis, overdueEmis };
}

async function getReferralData(agent) {
  return {
    referralLink: await getReferralLink(agent),
    referralCode: agent.referralCode,
  };
}

async function getDashboardData(agent) {
  return {
    wallet: await getWalletData(agent),
    rank: await getRankData(agent),
    bookings: await getBookingData(agent),
    team: await getTeamData(agent),
    commissions: await getCommissionData(agent),
    emis: await getEmiData(agent),
    referral: await getReferralData(agent),
  };
}

module.exports = { getDashboardData };