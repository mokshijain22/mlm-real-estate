const WithdrawalRequest = require('../../models/WithdrawalRequest');
const settingService = require('../../services/settingService');

function periodRange(period) {
  const now = new Date();
  if (period === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end };
  }
  if (period === 'this_year') {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear() + 1, 0, 1);
    return { start, end };
  }
  if (period === 'all_time') return null;
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

// GET /api/admin/finance-tds/overview?period=&agent_id=
async function overview(req, res) {
  const { period = 'this_month', agent_id } = req.query;
  const range = periodRange(period);

  const match = {
    status: 'approved',
    ...(agent_id ? { agent: agent_id } : {}),
    ...(range ? { reviewedAt: { $gte: range.start, $lt: range.end } } : {}),
  };

  const withdrawals = await WithdrawalRequest.find(match)
    .select('agent amount tdsAmount netAmount pointsType reviewedAt paymentReference')
    .populate('agent', 'name')
    .sort({ reviewedAt: -1 });

  const rows = withdrawals.map((w) => ({
    date: w.reviewedAt,
    agent: w.agent?.name || '-',
    pointsType: w.pointsType,
    grossAmount: w.amount || 0,
    tdsAmount: w.tdsAmount || 0,
    netAmount: w.netAmount || 0,
    reference: w.paymentReference || '-',
  }));

  const totalGross = rows.reduce((s, r) => s + r.grossAmount, 0);
  const totalTds = rows.reduce((s, r) => s + r.tdsAmount, 0);
  const totalNet = rows.reduce((s, r) => s + r.netAmount, 0);

  const currentRate = await settingService.get('tds_percentage', 2);

  res.json({
    data: rows,
    meta: {
      count: rows.length,
      totalGross,
      totalTds,
      totalNet,
      currentRate,
    },
  });
}

module.exports = { overview };