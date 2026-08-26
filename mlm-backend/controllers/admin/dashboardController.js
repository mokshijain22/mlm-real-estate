const Project = require('../../models/Project');
const Plot = require('../../models/Plot');
const Customer = require('../../models/Customer');
const Booking = require('../../models/Booking');
const Emi = require('../../models/Emi');
const WalletTransaction = require('../../models/WalletTransaction');
const WithdrawalRequest = require('../../models/WithdrawalRequest');
const SupportTicket = require('../../models/SupportTicket');
const User = require('../../models/User');
const Role = require('../../models/Role');
const { buildCompanyRows } = require('./reportController');

// GET /api/admin/dashboard
async function index(req, res) {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // 6-month window (for the Monthly Overview chart), oldest first
    const monthWindowStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const agentRole = await Role.findOne({ slug: 'agent' });

    // Keep the dashboard in sync with the EMI dues screen.  A pending line
    // becomes overdue at the start of the following day, not merely because
    // its stored date has a midnight time component.
    await Emi.updateMany(
      { status: 'pending', dueDate: { $lt: startOfToday } },
      { status: 'overdue' }
    );

    const [
      totalProjects,
      totalPlots,
      availablePlots,
      bookedPlots,
      soldPlots,
      totalCustomers,
      distributedBvAgg,
      distributedPvAgg,
      pendingBookings,
      pendingWithdrawals,
      openTickets,
      pendingKyc,
      emiCollectedAgg,
      tokenDpCollectedAgg,
      commissionDistributedAgg,
      newBookingsThisMonth,
      bvPaidOutAgg,
      pvPaidOutAgg,
      recentBookingsRaw,
      recentWithdrawalsRaw,
      emiByMonth,
      commissionByMonth,
      overdueAgg,
      overdueDuesRaw,
      totalRevenueAgg,
      totalOutstandingAgg,
      totalCommissionGeneratedAgg,
      companyEligibleTxns,
    ] = await Promise.all([
      Project.countDocuments({ status: 'active' }),
      Plot.countDocuments({}),
      Plot.countDocuments({ status: 'available' }),
      // Admin-created bookings mark the plot straight to 'sold' (see
      // bookingService.js's plotStatus logic), skipping 'booked' entirely —
      // so "Booked Plots" here counts both statuses together, i.e. every
      // plot that's no longer available, not just the transitional state.
      Plot.countDocuments({ status: { $in: ['booked', 'sold'] } }),
      Plot.countDocuments({ status: 'sold' }),
      Customer.countDocuments({ status: 'active' }),
      WalletTransaction.aggregate([
        { $match: { type: 'credit', pointsType: 'BV' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      WalletTransaction.aggregate([
        { $match: { type: 'credit', pointsType: 'PV' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Booking.countDocuments({ approvalStatus: 'pending' }),
      WithdrawalRequest.countDocuments({ status: 'pending' }),
      SupportTicket.countDocuments({ status: 'open' }),
      agentRole ? User.countDocuments({ role: agentRole._id, isKycVerified: false }) : Promise.resolve(0),
      // Pure EMI installments only (emiNumber 1, 2, 3...) — excludes Token
      // (0), Down Payments (negative), and Registry (99), which are tracked
      // separately below so this card doesn't overstate what's actually EMI.
      Emi.aggregate([
        { $match: { status: 'paid', paidDate: { $gte: startOfMonth, $lt: startOfNextMonth }, emiNumber: { $gt: 0, $lt: 99 } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Token + Down Payment(s) + Registry collected this month.
      Emi.aggregate([
        { $match: { status: 'paid', paidDate: { $gte: startOfMonth, $lt: startOfNextMonth }, $or: [{ emiNumber: { $lte: 0 } }, { emiNumber: 99 }] } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      WithdrawalRequest.aggregate([
        { $match: { status: 'approved', reviewedAt: { $gte: startOfMonth, $lt: startOfNextMonth } } },
        { $group: { _id: null, total: { $sum: '$netAmount' } } },
      ]),
      Booking.countDocuments({ bookingDate: { $gte: startOfMonth, $lt: startOfNextMonth } }),
      WithdrawalRequest.aggregate([
        { $match: { status: 'approved', pointsType: 'BV', reviewedAt: { $gte: startOfMonth, $lt: startOfNextMonth } } },
        { $group: { _id: null, total: { $sum: '$netAmount' } } },
      ]),
      WithdrawalRequest.aggregate([
        { $match: { status: 'approved', pointsType: 'PV', reviewedAt: { $gte: startOfMonth, $lt: startOfNextMonth } } },
        { $group: { _id: null, total: { $sum: '$netAmount' } } },
      ]),
      Booking.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('customer', 'name')
        .populate('project', 'name')
        .populate('plot', 'plotNumber')
        .select('customer project plot totalAmount bookingDate approvalStatus status createdAt'),
      WithdrawalRequest.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('agent', 'name')
        .select('agent amount netAmount status requestedAt createdAt'),
      Emi.aggregate([
        { $match: { status: 'paid', paidDate: { $gte: monthWindowStart, $lt: startOfNextMonth } } },
        { $group: { _id: { y: { $year: '$paidDate' }, m: { $month: '$paidDate' } }, total: { $sum: '$amount' } } },
      ]),
      WithdrawalRequest.aggregate([
        { $match: { status: 'approved', reviewedAt: { $gte: monthWindowStart, $lt: startOfNextMonth } } },
        { $group: { _id: { y: { $year: '$reviewedAt' }, m: { $month: '$reviewedAt' } }, total: { $sum: '$netAmount' } } },
      ]),
      Emi.aggregate([
        { $match: { status: 'overdue', dueDate: { $lt: startOfToday } } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } },
      ]),
      Emi.find({ status: 'overdue', dueDate: { $lt: startOfToday } })
        .sort({ dueDate: 1 })
        .limit(20)
        .populate({
          path: 'booking',
          select: 'customer project plot bookingNumber',
          populate: [
            { path: 'customer', select: 'name phone' },
            { path: 'project', select: 'name' },
            { path: 'plot', select: 'plotNumber' },
          ],
        })
        .select('booking emiNumber amount dueDate status'),
      // All-time total sale value of every active/completed booking
      Booking.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      // All-time ACTUALLY collected amount — booking.remainingAmount is only
      // a snapshot taken at booking-creation time (total EMI to be paid) and
      // never updates as installments get paid, so it can't be used to infer
      // what's actually been collected. Sum every paid Emi row instead —
      // this covers Token, Down Payment(s), regular EMIs, and Registry alike,
      // since all of them are stored as Emi documents.
      Emi.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // All-time commission generated (credited to agent wallets) — must
      // include every category actually credited, not just the two that
      // came from a direct sale. rank_difference is upline commission and
      // is just as real; leaving it out understates "Generated" and can make
      // "Pending" (Generated - Received) go negative once an agent withdraws
      // rank_difference earnings.
      WalletTransaction.aggregate([
        { $match: { type: 'credit', category: { $in: ['emi_commission', 'deposit_commission', 'rank_difference'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // All-time company share is virtual (computed per-transaction, not
      // stored) — reuse the same builder the Commissions Report uses so
      // both numbers stay in sync.
      WalletTransaction.find({ type: 'credit', category: { $in: ['emi_commission', 'deposit_commission'] } })
        .select('category booking emi sqftPortion pointsType createdAt')
        .populate('emi'),
      ]);

    const sumOf = (agg) => (agg[0] ? agg[0].total : 0);
    const companyRowsAllTime = await buildCompanyRows(companyEligibleTxns);
    const totalCompanyCommission = companyRowsAllTime.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const stats = {
      total_projects: totalProjects,
      total_plots: totalPlots,
      available_plots: availablePlots,
      booked_plots: bookedPlots,
      sold_plots: soldPlots,
      total_customers: totalCustomers,
      distributed_bv: sumOf(distributedBvAgg),
      distributed_pv: sumOf(distributedPvAgg),
      pending_bookings: pendingBookings,
      pending_withdrawals: pendingWithdrawals,
      open_tickets: openTickets,
      pending_kyc: pendingKyc,
      emi_collected_this_month: sumOf(emiCollectedAgg),
      token_dp_collected_this_month: sumOf(tokenDpCollectedAgg),
      commission_distributed_this_month: sumOf(commissionDistributedAgg),
      new_bookings_this_month: newBookingsThisMonth,
      total_bv_paid_out: sumOf(bvPaidOutAgg),
      total_pv_paid_out: sumOf(pvPaidOutAgg),
      overdue_lines: overdueAgg[0]?.count || 0,
      overdue_outstanding: overdueAgg[0]?.total || 0,
      total_revenue_sale: sumOf(totalRevenueAgg),
      total_revenue_collected: sumOf(totalOutstandingAgg),
      total_outstanding: sumOf(totalRevenueAgg) - sumOf(totalOutstandingAgg),
      total_commission_generated: sumOf(totalCommissionGeneratedAgg) + totalCompanyCommission,
      total_company_commission: totalCompanyCommission,
    };

    const overdueDues = overdueDuesRaw.map((e) => ({
      id: e._id,
      customer: e.booking?.customer?.name || '—',
      phone: e.booking?.customer?.phone || '',
      project: e.booking?.project?.name || '—',
      plot: e.booking?.plot?.plotNumber || '—',
      step: `EMI ${e.emiNumber}`,
      dueDate: e.dueDate,
      amount: e.amount,
      bookingId: e.booking?._id || null,
    }));

    const recentBookings = recentBookingsRaw.map((b) => ({
      id: b._id,
      customer: b.customer?.name || '—',
      project: b.project?.name || '—',
      plot: b.plot?.plotNumber || '—',
      amount: b.totalAmount,
      date: b.bookingDate || b.createdAt,
      status: b.approvalStatus,
    }));

    const recentWithdrawals = recentWithdrawalsRaw.map((w) => ({
      id: w._id,
      agent: w.agent?.name || '—',
      amount: w.netAmount ?? w.amount,
      requestedOn: w.requestedAt || w.createdAt,
      status: w.status,
    }));

    // Build a 6-month labeled series, filling months with no data as 0
    const monthLabels = [];
    const monthKeys = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthLabels.push(d.toLocaleString('en-IN', { month: 'short' }));
      monthKeys.push(`${d.getFullYear()}-${d.getMonth() + 1}`);
    }
    const emiMap = new Map(emiByMonth.map((r) => [`${r._id.y}-${r._id.m}`, r.total]));
    const commissionMap = new Map(commissionByMonth.map((r) => [`${r._id.y}-${r._id.m}`, r.total]));

    const monthlyOverview = {
      labels: monthLabels,
      emiCollected: monthKeys.map((k) => emiMap.get(k) || 0),
      commissionPaid: monthKeys.map((k) => commissionMap.get(k) || 0),
    };

    return res.json({
      title: 'Admin Dashboard',
      stats,
      recentBookings,
      recentWithdrawals,
      monthlyOverview,
      overdueDues,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch dashboard.', error: err.message });
  }
}

module.exports = { index };
