const WithdrawalRequest = require('../../models/WithdrawalRequest');
const WalletTransaction = require('../../models/WalletTransaction');
const settingService = require('../../services/settingService');
const { buildCompanyRows } = require('./reportController');

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

// GET /api/admin/finance-tds/owner-overview?period=&project_id=
async function ownerOverview(req, res) {
  const { period = 'this_month', project_id } = req.query;
  const range = periodRange(period);

  const query = {
    type: 'credit',
    category: { $in: ['emi_commission', 'deposit_commission'] },
    ...(range ? { createdAt: { $gte: range.start, $lt: range.end } } : {}),
  };

  const txns = await WalletTransaction.find(query)
    .select('category booking emi sqftPortion pointsType createdAt')
    .populate({ path: 'booking', select: 'bookingNumber project plot', populate: [{ path: 'project', select: 'name' }, { path: 'plot', select: 'plotNumber' }] })
    .populate('emi')
    .sort({ createdAt: -1 });

  let companyRows = await buildCompanyRows(txns);

  if (project_id) {
    companyRows = companyRows.filter((r) => String(r.booking?.project?._id || r.booking?.project) === String(project_id));
  }

  const ownerTdsRate = await settingService.get('owner_tds_percentage', 10);

  const rows = companyRows.map((r) => {
    const gross = Number(r.amount) || 0;
    // TDS only applies to Online (BV) payments — Cash (PV) receipts are not
    // subject to owner TDS deduction.
    const isCash = r.pointsType === 'PV';
    const tds = isCash ? 0 : Math.round(gross * (ownerTdsRate / 100) * 100) / 100;
    return {
      date: r.createdAt,
      reference: r.booking?.bookingNumber || '-',
      project: r.booking?.project?.name || '-',
      plot: r.booking?.plot?.plotNumber || '-',
      pointsType: r.pointsType,
      grossAmount: gross,
      tdsAmount: tds,
      netAmount: gross - tds,
    };
  });

  const totalGross = rows.reduce((s, r) => s + r.grossAmount, 0);
  const totalTds = rows.reduce((s, r) => s + r.tdsAmount, 0);
  const totalNet = rows.reduce((s, r) => s + r.netAmount, 0);

  res.json({
    data: rows,
    meta: {
      count: rows.length,
      totalGross,
      totalTds,
      totalNet,
      currentRate: ownerTdsRate,
    },
  });
}

module.exports = { overview, ownerOverview };