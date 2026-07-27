const User = require('../../models/User');
const Rank = require('../../models/Rank');
const treeBuilderService = require('../../services/treeBuilderService');

// GET /api/agent/referrals
async function index(req, res) {
  const agent = await User.findById(req.user._id).populate('rank');

  // 1. Direct referrals
  const directReferrals = await User.find({ referredBy: agent._id }).populate('rank');

  // 2. Total team IDs
  const downlineIds = await treeBuilderService.getDownlineIds(agent);
  const totalTeam = downlineIds.length;

  // 3. Downline statistics
  const [activeMembers, pendingKyc] = await Promise.all([
    User.countDocuments({ _id: { $in: downlineIds }, status: 'active' }),
    User.countDocuments({ _id: { $in: downlineIds }, isKycVerified: false }),
  ]);

  // 4. Group/Rank-wise referral links — agent can only place new joiners
  // into their own rank or any rank below it (never above their own rank).
  const ownSortOrder = agent.rank?.sortOrder || 0;
  const eligibleRanks = await Rank.find({ sortOrder: { $lte: ownSortOrder } }).sort({ sortOrder: 1 });

  return res.json({
    agent,
    directReferrals,
    totalTeam,
    activeMembers,
    pendingKyc,
    eligibleRanks,
  });
}

// GET /api/agent/referrals/team
async function team(req, res) {
  const agent = await User.findById(req.user._id).populate('rank');

  const downlineIds = await treeBuilderService.getDownlineIds(agent);
  const allRanks = await Rank.find().sort({ sortOrder: 1 });

  const teamByRank = {};
  for (const rank of allRanks) {
    const users = await User.find({ _id: { $in: downlineIds }, rank: rank._id });

    // withCount('referrals') equivalent — count of each user's direct referrals
    const usersWithCounts = await Promise.all(
      users.map(async (u) => {
        const referralsCount = await User.countDocuments({ referredBy: u._id });
        return { ...u.toObject(), referrals_count: referralsCount };
      })
    );

    teamByRank[rank._id] = {
      rank,
      users: usersWithCounts,
    };
  }

  const treeData = await treeBuilderService.getHierarchicalTree(agent);

  return res.json({
    agent,
    teamByRank,
    allRanks,
    treeData,
  });
}

module.exports = { index, team };