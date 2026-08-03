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
  // default: this_month
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

  // --- Collected (this period) ---
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

  // --- Plot value / outstanding (all-time snapshot, not period-boxed) ---
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

  // --- Commission (this period) ---
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

module.exports = { overview };