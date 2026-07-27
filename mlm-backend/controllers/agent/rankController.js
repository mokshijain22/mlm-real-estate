const Rank = require('../../models/Rank');
const RankHistory = require('../../models/RankHistory');
const User = require('../../models/User');

// GET /api/agent/rank
async function index(req, res) {
  const agent = await User.findById(req.user._id).populate('rank');

  const rankHistory = await RankHistory.find({ agent: agent._id })
    .populate('oldRank')
    .populate('newRank')
    .sort({ upgradedAt: -1 });

  let nextRank = null;
  let salesNeeded = 0;
  let progressPercent = 0;

  if (agent.rank) {
    nextRank = await Rank.findOne({ sortOrder: { $gt: agent.rank.sortOrder } }).sort({ sortOrder: 1 });

    if (nextRank) {
      salesNeeded = Math.max(0, nextRank.minGroupSales - agent.totalGroupSales);

      const currentRankMin = agent.rank.minGroupSales;
      const targetRankMin = nextRank.minGroupSales;

      const diff = targetRankMin - currentRankMin;
      if (diff > 0) {
        const progress = Math.max(0, agent.totalGroupSales - currentRankMin);
        progressPercent = Math.min(100, Math.round((progress / diff) * 10000) / 100);
      } else {
        progressPercent = 100;
      }
    }
  } else {
    nextRank = await Rank.findOne().sort({ sortOrder: 1 });
    if (nextRank) {
      salesNeeded = nextRank.minGroupSales;
      progressPercent = 0;
    }
  }

  const allRanks = await Rank.find().sort({ sortOrder: 1 });

  return res.json({
    agent,
    rankHistory,
    nextRank,
    progressPercent,
    sqftNeeded: salesNeeded,
    allRanks,
  });
}

module.exports = { index };