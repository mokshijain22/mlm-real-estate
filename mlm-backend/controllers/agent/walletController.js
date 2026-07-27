const AgentWallet = require('../../models/AgentWallet');
const WithdrawalRequest = require('../../models/WithdrawalRequest');
const WalletTransaction = require('../../models/WalletTransaction');
const settingService = require('../../services/settingService');
const withdrawalService = require('../../services/withdrawalService');

// GET /api/agent/wallet
async function index(req, res) {
  const agent = req.user;

  let wallet = await AgentWallet.findOne({ agent: agent._id });
  if (!wallet) {
    wallet = await AgentWallet.create({ agent: agent._id, bvBalance: 0, pvBalance: 0 });
  }

  const pendingRequests = await WithdrawalRequest.find({ agent: agent._id, status: 'pending' }).sort({
    requestedAt: -1,
  });

  const recentTransactions = await WalletTransaction.find({ agent: agent._id })
    .populate('withdrawal')
    .sort({ createdAt: -1 })
    .limit(10);

  const minWithdrawal = await settingService.get('min_withdrawal_amount', 500);
  const tdsPercent = await settingService.get('tds_percentage', 2);

  return res.json({
    wallet,
    pendingRequests,
    recentTransactions,
    minWithdrawal,
    tdsPercent,
  });
}

// POST /api/agent/wallet/withdraw
async function withdraw(req, res) {
  const { points_type, amount } = req.body;

  const errors = {};
  if (!points_type || !['BV', 'PV'].includes(String(points_type).toUpperCase())) {
    errors.points_type = 'points_type must be BV or PV.';
  }
  if (amount === undefined || isNaN(amount) || Number(amount) < 1) {
    errors.amount = 'amount must be a number of at least 1.';
  }
  if (Object.keys(errors).length) return res.status(422).json({ errors });

  try {
    const request = await withdrawalService.requestWithdrawal(
      req,
      req.user,
      Number(amount),
      points_type
    );
    return res.status(201).json({
      message: 'Withdrawal request submitted successfully',
      data: request,
    });
  } catch (err) {
    return res.status(422).json({ message: err.message });
  }
}

// GET /api/agent/wallet/transactions
async function transactions(req, res) {
  const agent = req.user;
  const { type, category, points_type, date_from, date_to, page, limit } = req.query;

  const filter = { agent: agent._id };
  if (type) filter.type = type;
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

  const [items, total] = await Promise.all([
    WalletTransaction.find(filter)
      .populate('withdrawal')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * perPage)
      .limit(perPage),
    WalletTransaction.countDocuments(filter),
  ]);

  // Summary for filtering (not affected by filters, mirrors Laravel)
  const [creditAgg, debitAgg] = await Promise.all([
    WalletTransaction.aggregate([
      { $match: { agent: agent._id, type: 'credit' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    WalletTransaction.aggregate([
      { $match: { agent: agent._id, type: 'debit' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  return res.json({
    transactions: items,
    pagination: {
      total,
      per_page: perPage,
      current_page: pageNum,
      last_page: Math.max(Math.ceil(total / perPage), 1),
    },
    totalCredits: creditAgg[0]?.total || 0,
    totalDebits: debitAgg[0]?.total || 0,
  });
}

module.exports = { index, withdraw, transactions };