const WithdrawalRequest = require('../../models/WithdrawalRequest');
const withdrawalService = require('../../services/withdrawalService');

// GET /api/admin/withdrawals?status=&points_type=&agent_id=&date_from=&date_to=&page=
async function index(req, res) {
  try {
    const { status, points_type, agent_id, date_from, date_to, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (points_type) query.pointsType = points_type;
    if (agent_id) query.agent = agent_id;

    if (search && search.trim()) {
      const User = require('../../models/User');
      const re = new RegExp(search.trim(), 'i');
      const matchedAgents = await User.find({ name: re }).select('_id');
      query.$or = [
        { paymentReference: re },
        { agent: { $in: matchedAgents.map((a) => a._id) } },
      ];
    }

    if (date_from || date_to) {
      query.requestedAt = {};
      if (date_from) query.requestedAt.$gte = new Date(date_from);
      if (date_to) {
        const end = new Date(date_to);
        end.setHours(23, 59, 59, 999);
        query.requestedAt.$lte = end;
      }
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      WithdrawalRequest.find(query)
        .populate({ path: 'agent', select: 'name email phone rank isKycVerified', populate: { path: 'rank' } })
        .populate('reviewedBy', 'name email')
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(limit),
      WithdrawalRequest.countDocuments(query),
    ]);

    // Summary statistics (mirrors Laravel index stats)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [pendingCount, approvedThisMonth, totalPaidBvAgg, totalPaidPvAgg] = await Promise.all([
      WithdrawalRequest.countDocuments({ status: 'pending' }),
      WithdrawalRequest.countDocuments({
        status: 'approved',
        reviewedAt: { $gte: monthStart, $lt: monthEnd },
      }),
      WithdrawalRequest.aggregate([
        { $match: { status: 'approved', pointsType: 'BV' } },
        { $group: { _id: null, total: { $sum: '$netAmount' } } },
      ]),
      WithdrawalRequest.aggregate([
        { $match: { status: 'approved', pointsType: 'PV' } },
        { $group: { _id: null, total: { $sum: '$netAmount' } } },
      ]),
    ]);

    const stats = {
      pending_count: pendingCount,
      approved_this_month: approvedThisMonth,
      total_paid_bv: totalPaidBvAgg[0]?.total || 0,
      total_paid_pv: totalPaidPvAgg[0]?.total || 0,
    };

    return res.json({
      data: withdrawals,
      meta: { page, limit, total, lastPage: Math.ceil(total / limit) },
      stats,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch withdrawal requests.', error: err.message });
  }
}

// GET /api/admin/withdrawals/:id
async function show(req, res) {
  try {
    const withdrawal = await WithdrawalRequest.findById(req.params.id)
      .populate({ path: 'agent', select: 'name email phone rank isKycVerified', populate: { path: 'rank' } })
      .populate('reviewedBy', 'name email');

    if (!withdrawal) return res.status(404).json({ message: 'Withdrawal request not found.' });

    const AgentWallet = require('../../models/AgentWallet');
    const wallet = await AgentWallet.findOne({ agent: withdrawal.agent._id });

    return res.json({ withdrawal, wallet });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch withdrawal request.', error: err.message });
  }
}

// PATCH /api/admin/withdrawals/:id/approve
async function approve(req, res) {
  try {
    const { payment_reference } = req.body;

    if (!payment_reference || !payment_reference.trim()) {
      return res.status(422).json({ errors: { payment_reference: 'Payment reference is required.' } });
    }

    const withdrawal = await WithdrawalRequest.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ message: 'Withdrawal request not found.' });

    await withdrawalService.approveWithdrawal(req, withdrawal, req.user, payment_reference.trim());

    return res.json({ message: 'Withdrawal request approved and processed.', data: withdrawal });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

// PATCH /api/admin/withdrawals/:id/reject
async function reject(req, res) {
  try {
    const { rejection_reason } = req.body;

    if (!rejection_reason || rejection_reason.trim().length < 10) {
      return res.status(422).json({ errors: { rejection_reason: 'Rejection reason must be at least 10 characters.' } });
    }

    const withdrawal = await WithdrawalRequest.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ message: 'Withdrawal request not found.' });

    await withdrawalService.rejectWithdrawal(req, withdrawal, req.user, rejection_reason.trim());

    return res.json({ message: 'Withdrawal request rejected and amount refunded to agent wallet.', data: withdrawal });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

module.exports = { index, show, approve, reject };