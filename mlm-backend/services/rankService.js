const User = require('../models/User');
const Booking = require('../models/Booking');
const Rank = require('../models/Rank');
const treeBuilderService = require('./treeBuilderService');

/**
 * Update an agent's group-sales / team-size stats and propagate up the chain.
 *
 * NOTE: Automatic rank_id changes based on minGroupSales/minTeamSize are
 * intentionally disabled (matches Laravel comment) — rank is only set by:
 *   1) Default rank on registration
 *   2) A rank/group referral link
 *   3) Manual admin edit
 * This function only recalculates stats for reporting, never changes rank.
 */
async function checkAndUpgradeRank(agent) {
  if (!agent) return;

  // 1. Downline IDs
  const downlineIds = await treeBuilderService.getDownlineIds(agent);
  const allIds = [...downlineIds, agent._id.toString()];

  // 2. Total group sales = count of active/completed bookings across agent + downline
  const totalGroupSales = await Booking.countDocuments({
    agent: { $in: allIds },
    status: { $in: ['active', 'completed'] },
  });

  // 3. Team size = KYC verified + active downline agents only
  const teamSize = await User.countDocuments({
    _id: { $in: downlineIds },
    isKycVerified: true,
    status: 'active',
  });

  // 4. Update agent stats
  agent.totalGroupSales = totalGroupSales;
  agent.totalTeamSize = teamSize;
  await agent.save();

  // 5 & 6. Automatic rank upgrade intentionally removed (matches Laravel).

  // 7. Recursively update stats for all upline agents (rank untouched)
  const uplineChain = await treeBuilderService.getUplineChain(agent);
  for (const uplineId of Object.values(uplineChain)) {
    const uplineAgent = await User.findById(uplineId);
    if (uplineAgent) {
      await checkAndUpgradeRank(uplineAgent);
    }
  }
}

/**
 * Get the rank points (BV or PV) for an agent, with fallback to lowest rank.
 */
async function getAgentRankPoints(agent, mode) {
  const field = mode.toUpperCase() === 'BV' ? 'bvPoints' : 'pvPoints';

  if (agent.rank) {
    const rank = agent.rank._id ? agent.rank : await Rank.findById(agent.rank);
    if (rank) return Number(rank[field]);
  }

  const lowestRank = await Rank.findOne().sort({ sortOrder: 1 });
  return lowestRank ? Number(lowestRank[field]) : 50.0;
}

module.exports = { checkAndUpgradeRank, getAgentRankPoints };