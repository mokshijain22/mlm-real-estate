const Project = require('../../models/Project');
const Plot = require('../../models/Plot');
const Customer = require('../../models/Customer');
const Booking = require('../../models/Booking');
const Emi = require('../../models/Emi');
const WalletTransaction = require('../../models/WalletTransaction');
const WithdrawalRequest = require('../../models/WithdrawalRequest');
const SupportTicket = require('../../models/SupportTicket');

// GET /api/admin/dashboard
async function index(req, res) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

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
      emiCollectedAgg,
      commissionDistributedAgg,
      newBookingsThisMonth,
      bvPaidOutAgg,
      pvPaidOutAgg,
    ] = await Promise.all([
      Project.countDocuments({ status: 'active' }),
      Plot.countDocuments({}),
      Plot.countDocuments({ status: 'available' }),
      Plot.countDocuments({ status: 'booked' }),
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
      Emi.aggregate([
        { $match: { status: 'paid', paidDate: { $gte: startOfMonth, $lt: startOfNextMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      WalletTransaction.aggregate([
        { $match: { type: 'credit', category: 'emi_commission', createdAt: { $gte: startOfMonth, $lt: startOfNextMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
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
    ]);

    const sumOf = (agg) => (agg[0] ? agg[0].total : 0);

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
      emi_collected_this_month: sumOf(emiCollectedAgg),
      commission_distributed_this_month: sumOf(commissionDistributedAgg),
      new_bookings_this_month: newBookingsThisMonth,
      total_bv_paid_out: sumOf(bvPaidOutAgg),
      total_pv_paid_out: sumOf(pvPaidOutAgg),
    };

    return res.json({ title: 'Admin Dashboard', stats });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch dashboard.', error: err.message });
  }
}

module.exports = { index };