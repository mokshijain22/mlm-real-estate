const Booking = require('../../models/Booking');
const Emi = require('../../models/Emi');
const WalletTransaction = require('../../models/WalletTransaction');
const WithdrawalRequest = require('../../models/WithdrawalRequest');

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

async function projectBookingIds(projectId) {
  if (!projectId) return null;
  const bookings = await Booking.find({ project: projectId }).select('_id');
  return bookings.map((b) => b._id);
}

// GET /api/admin/account-ledger/overview?period=&project_id=
async function overview(req, res) {
  const { period = 'this_month', project_id } = req.query;
  const range = periodRange(period);
  const bookingIds = await projectBookingIds(project_id);

  const bookingProjectFilter = project_id ? { project: project_id } : {};
  const emiProjectFilter = bookingIds ? { booking: { $in: bookingIds } } : {};
  const wtProjectFilter = bookingIds ? { booking: { $in: bookingIds } } : {};

  const bookingPaymentMatch = {
    ...bookingProjectFilter,
    approvalStatus: 'approved',
    ...(range ? { paymentDate: { $gte: range.start, $lt: range.end } } : {}),
  };
  const bookingPayments = await Booking.find(bookingPaymentMatch).select('bookingAmount paymentMode paymentDate');

  const emiPaidMatch = {
    ...emiProjectFilter,
    status: 'paid',
    ...(range ? { paidDate: { $gte: range.start, $lt: range.end } } : {}),
  };
  const emiPayments = await Emi.find(emiPaidMatch).select('amount paymentMode paidDate');

  const modeGroup = { cash: 0, bank: 0, cheque: 0 };
  let collected = 0;
  let collectedTransactions = 0;

  for (const b of bookingPayments) {
    const amt = b.bookingAmount || 0;
    collected += amt;
    collectedTransactions += 1;
    if (b.paymentMode === 'cash') modeGroup.cash += amt;
    else if (b.paymentMode === 'cheque') modeGroup.cheque += amt;
    else modeGroup.bank += amt;
  }
  for (const e of emiPayments) {
    const amt = e.amount || 0;
    collected += amt;
    collectedTransactions += 1;
    if (e.paymentMode === 'cash') modeGroup.cash += amt;
    else if (e.paymentMode === 'cheque') modeGroup.cheque += amt;
    else modeGroup.bank += amt;
  }

  const approvedBookings = await Booking.find({ ...bookingProjectFilter, approvalStatus: 'approved' }).select('totalAmount bookingAmount _id');
  const plotValueTotal = approvedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const approvedBookingIds = approvedBookings.map((b) => b._id);
  const collectedFromBookingsAllTime = approvedBookings.reduce((s, b) => s + (b.bookingAmount || 0), 0);

  const collectedFromEmisAgg = await Emi.aggregate([
    { $match: { booking: { $in: approvedBookingIds }, status: 'paid' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const receivedToDate = collectedFromBookingsAllTime + (collectedFromEmisAgg[0]?.total || 0);
  const outstanding = Math.max(plotValueTotal - receivedToDate, 0);
  const collectionRate = plotValueTotal > 0 ? (receivedToDate / plotValueTotal) * 100 : 0;

  const commissionMatch = {
    ...wtProjectFilter,
    type: 'credit',
    category: { $in: ['emi_commission', 'rank_difference'] },
    ...(range ? { createdAt: { $gte: range.start, $lt: range.end } } : {}),
  };
  const commissionAgg = await WalletTransaction.aggregate([
    { $match: commissionMatch },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const commission = commissionAgg[0]?.total || 0;

  const withdrawalMatch = {
    status: 'approved',
    ...(range ? { reviewedAt: { $gte: range.start, $lt: range.end } } : {}),
  };
  const withdrawalAgg = await WithdrawalRequest.aggregate([
    { $match: withdrawalMatch },
    { $group: { _id: null, total: { $sum: '$netAmount' } } },
  ]);
  const commissionPaid = Math.min(withdrawalAgg[0]?.total || 0, commission);
  const commissionPending = Math.max(commission - commissionPaid, 0);
  const commissionPaidOutPct = commission > 0 ? (commissionPaid / commission) * 100 : 0;

  res.json({
    data: {
      period,
      collected,
      collectedTransactions,
      outstanding,
      plotValueTotal,
      collectionRate,
      commission,
      commissionPaid,
      commissionPending,
      breakdown: { ...modeGroup, total: collected },
      receivables: {
        collectionProgressPct: collectionRate,
        commissionPaidOutPct,
        plotValueTotal,
        receivedToDate,
      },
    },
  });
}

// GET /api/admin/account-ledger/collections?period=&project_id=
async function collections(req, res) {
  const { period = 'this_month', project_id } = req.query;
  const range = periodRange(period);
  const bookingIds = await projectBookingIds(project_id);

  const bookingProjectFilter = project_id ? { project: project_id } : {};
  const emiProjectFilter = bookingIds ? { booking: { $in: bookingIds } } : {};

  const bookingPaymentMatch = {
    ...bookingProjectFilter,
    approvalStatus: 'approved',
    ...(range ? { paymentDate: { $gte: range.start, $lt: range.end } } : {}),
  };
  const bookingPayments = await Booking.find(bookingPaymentMatch)
    .select('bookingNumber bookingAmount paymentMode paymentDate customer project')
    .populate('customer', 'name')
    .populate('project', 'name')
    .sort({ paymentDate: -1 });

  const emiPaidMatch = {
    ...emiProjectFilter,
    status: 'paid',
    ...(range ? { paidDate: { $gte: range.start, $lt: range.end } } : {}),
  };
  const emiPayments = await Emi.find(emiPaidMatch)
    .select('amount paymentMode paidDate emiNumber booking')
    .populate({ path: 'booking', select: 'bookingNumber customer project', populate: [{ path: 'customer', select: 'name' }, { path: 'project', select: 'name' }] })
    .sort({ paidDate: -1 });

  const rows = [];
  for (const b of bookingPayments) {
    rows.push({
      date: b.paymentDate,
      type: 'Booking amount',
      reference: b.bookingNumber,
      customer: b.customer?.name || '-',
      project: b.project?.name || '-',
      mode: b.paymentMode,
      amount: b.bookingAmount || 0,
    });
  }
  for (const e of emiPayments) {
    rows.push({
      date: e.paidDate,
      type: `EMI #${e.emiNumber}`,
      reference: e.booking?.bookingNumber || '-',
      customer: e.booking?.customer?.name || '-',
      project: e.booking?.project?.name || '-',
      mode: e.paymentMode,
      amount: e.amount || 0,
    });
  }

  rows.sort((a, b) => new Date(b.date) - new Date(a.date));

  const total = rows.reduce((s, r) => s + r.amount, 0);
  res.json({ data: rows, meta: { count: rows.length, total } });
}

// GET /api/admin/account-ledger/dp-emis?period=&project_id=
async function dpEmis(req, res) {
  const { period = 'this_month', project_id } = req.query;
  const range = periodRange(period);
  const bookingIds = await projectBookingIds(project_id);
  const bookingProjectFilter = project_id ? { project: project_id } : {};
  const emiProjectFilter = bookingIds ? { booking: { $in: bookingIds } } : {};

  const bookings = await Booking.find({ ...bookingProjectFilter, approvalStatus: 'approved' })
    .select('bookingNumber customer project downPaymentAmount downPaymentDueDate downPayment2Amount downPayment2DueDate registryAmount registryDueDate')
    .populate('customer', 'name')
    .populate('project', 'name');

  const rows = [];
  const now = new Date();

  const inRange = (d) => {
    if (!range) return true;
    if (!d) return false;
    const dd = new Date(d);
    return dd >= range.start && dd < range.end;
  };

  for (const b of bookings) {
    const stages = [
      { label: 'Down Payment 1', amount: b.downPaymentAmount, dueDate: b.downPaymentDueDate },
      { label: 'Down Payment 2', amount: b.downPayment2Amount, dueDate: b.downPayment2DueDate },
      { label: 'Registry', amount: b.registryAmount, dueDate: b.registryDueDate },
    ];
    for (const s of stages) {
      if (!s.amount) continue;
      if (!inRange(s.dueDate)) continue;
      const overdue = s.dueDate && new Date(s.dueDate) < now;
      rows.push({
        type: s.label,
        reference: b.bookingNumber,
        customer: b.customer?.name || '-',
        project: b.project?.name || '-',
        dueDate: s.dueDate,
        amount: s.amount,
        status: overdue ? 'overdue' : 'pending',
      });
    }
  }

  const emis = await Emi.find({
    ...emiProjectFilter,
    ...(range ? { dueDate: { $gte: range.start, $lt: range.end } } : {}),
  })
    .select('emiNumber amount dueDate status paidDate booking')
    .populate({ path: 'booking', select: 'bookingNumber customer project', populate: [{ path: 'customer', select: 'name' }, { path: 'project', select: 'name' }] })
    .sort({ dueDate: 1 });

  for (const e of emis) {
    rows.push({
      type: `EMI #${e.emiNumber}`,
      reference: e.booking?.bookingNumber || '-',
      customer: e.booking?.customer?.name || '-',
      project: e.booking?.project?.name || '-',
      dueDate: e.dueDate,
      amount: e.amount,
      status: e.status,
    });
  }

  rows.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const totalDue = rows.reduce((s, r) => s + (r.amount || 0), 0);
  const totalPending = rows.filter((r) => r.status === 'pending' || r.status === 'overdue').reduce((s, r) => s + (r.amount || 0), 0);
  const totalOverdue = rows.filter((r) => r.status === 'overdue').reduce((s, r) => s + (r.amount || 0), 0);

  res.json({
    data: rows,
    meta: { count: rows.length, totalDue, totalPending, totalOverdue },
  });
}

// GET /api/admin/account-ledger/receivables?period=&project_id=
// Per-booking outstanding balance snapshot (all-time, not period-boxed).
async function receivables(req, res) {
  const { project_id } = req.query;
  const bookingProjectFilter = project_id ? { project: project_id } : {};

  const bookings = await Booking.find({ ...bookingProjectFilter, approvalStatus: 'approved', status: { $ne: 'cancelled' } })
    .select('bookingNumber customer project totalAmount bookingAmount')
    .populate('customer', 'name')
    .populate('project', 'name');

  const bookingIds = bookings.map((b) => b._id);
  const emiPaidAgg = await Emi.aggregate([
    { $match: { booking: { $in: bookingIds }, status: 'paid' } },
    { $group: { _id: '$booking', total: { $sum: '$amount' } } },
  ]);
  const emiPaidMap = {};
  for (const row of emiPaidAgg) emiPaidMap[row._id.toString()] = row.total;

  const rows = bookings
    .map((b) => {
      const paid = (b.bookingAmount || 0) + (emiPaidMap[b._id.toString()] || 0);
      const outstanding = Math.max((b.totalAmount || 0) - paid, 0);
      return {
        reference: b.bookingNumber,
        customer: b.customer?.name || '-',
        project: b.project?.name || '-',
        totalAmount: b.totalAmount || 0,
        paid,
        outstanding,
      };
    })
    .filter((r) => r.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding);

  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0);
  res.json({ data: rows, meta: { count: rows.length, totalOutstanding } });
}

// GET /api/admin/account-ledger/commission?period=&project_id=
async function commission(req, res) {
  const { period = 'this_month', project_id } = req.query;
  const range = periodRange(period);
  const bookingIds = await projectBookingIds(project_id);
  const wtProjectFilter = bookingIds ? { booking: { $in: bookingIds } } : {};

  const match = {
    ...wtProjectFilter,
    type: 'credit',
    category: { $in: ['emi_commission', 'rank_difference'] },
    ...(range ? { createdAt: { $gte: range.start, $lt: range.end } } : {}),
  };

  const txns = await WalletTransaction.find(match)
    .select('agent amount pointsType category createdAt remark booking')
    .populate('agent', 'name')
    .populate({ path: 'booking', select: 'bookingNumber project', populate: { path: 'project', select: 'name' } })
    .sort({ createdAt: -1 })
    .limit(200);

  const rows = txns.map((t) => ({
    date: t.createdAt,
    agent: t.agent?.name || '-',
    reference: t.booking?.bookingNumber || '-',
    project: t.booking?.project?.name || '-',
    category: t.category,
    pointsType: t.pointsType,
    amount: t.amount || 0,
    remark: t.remark,
  }));

  const totalBV = rows.filter((r) => r.pointsType === 'BV').reduce((s, r) => s + r.amount, 0);
  const totalPV = rows.filter((r) => r.pointsType === 'PV').reduce((s, r) => s + r.amount, 0);

  res.json({ data: rows, meta: { count: rows.length, totalBV, totalPV, total: totalBV + totalPV } });
}

module.exports = { overview, collections, dpEmis, receivables, commission };