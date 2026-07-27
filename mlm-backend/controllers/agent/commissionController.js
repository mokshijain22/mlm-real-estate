const WalletTransaction = require('../../models/WalletTransaction');
const AgentWallet = require('../../models/AgentWallet');

// GET /api/agent/commissions
async function index(req, res) {
  const agent = req.user;
  const { category, points_type, date_from, date_to, page, limit } = req.query;

  const filter = { agent: agent._id, type: 'credit' };

  if (category) filter.category = category;
  if (points_type) filter.pointsType = points_type;

  if (date_from || date_to) {
    filter.createdAt = {};
    if (date_from) {
      const from = new Date(date_from);
      from.setHours(0, 0, 0, 0);
      filter.createdAt.$gte = from;
    }
    if (date_to) {
      const to = new Date(date_to);
      to.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = to;
    }
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const perPage = Math.max(parseInt(limit, 10) || 20, 1);

  const [transactions, total] = await Promise.all([
    WalletTransaction.find(filter)
      .populate({ path: 'booking', populate: { path: 'plot' } })
      .populate('emi')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * perPage)
      .limit(perPage),
    WalletTransaction.countDocuments(filter),
  ]);

  // Summary Stats (mirrors Laravel: not affected by filters)
  const [bvAgg, pvAgg] = await Promise.all([
    WalletTransaction.aggregate([
      { $match: { agent: agent._id, type: 'credit', pointsType: 'BV' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    WalletTransaction.aggregate([
      { $match: { agent: agent._id, type: 'credit', pointsType: 'PV' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const totalBvEarned = bvAgg[0]?.total || 0;
  const totalPvEarned = pvAgg[0]?.total || 0;

  let wallet = await AgentWallet.findOne({ agent: agent._id });
  if (!wallet) {
    wallet = await AgentWallet.create({ agent: agent._id, bvBalance: 0, pvBalance: 0 });
  }

  return res.json({
    transactions,
    pagination: {
      total,
      per_page: perPage,
      current_page: pageNum,
      last_page: Math.max(Math.ceil(total / perPage), 1),
    },
    totalBvEarned,
    totalPvEarned,
    wallet,
  });
}

module.exports = { index };