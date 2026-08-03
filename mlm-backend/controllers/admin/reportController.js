const Emi = require('../../models/Emi');
const Booking = require('../../models/Booking');
const Plot = require('../../models/Plot');
const Project = require('../../models/Project');
const User = require('../../models/User');
const Rank = require('../../models/Rank');
const Customer = require('../../models/Customer');
const WalletTransaction = require('../../models/WalletTransaction');
const WithdrawalRequest = require('../../models/WithdrawalRequest');
const Role = require('../../models/Role');

function startEndOfMonth(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

function dateRangeFilter(field, date_from, date_to) {
  const filter = {};
  if (date_from || date_to) {
    filter[field] = {};
    if (date_from) filter[field].$gte = new Date(date_from);
    if (date_to) {
      const end = new Date(date_to);
      end.setHours(23, 59, 59, 999);
      filter[field].$lte = end;
    }
  }
  return filter;
}

async function sumAmount(Model, query, field = 'amount') {
  const result = await Model.aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: `$${field}` } } }]);
  return result[0]?.total || 0;
}

function toCsv(headers, rows) {
  const escape = (val) => {
    const s = val === null || val === undefined ? '' : String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) {
    lines.push(row.map(escape).join(','));
  }
  return lines.join('\n');
}

function sendCsv(res, filename, csvContent) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(csvContent);
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

// GET /api/admin/reports
async function overview(req, res) {
  try {
    const { start: startOfMonth, end: endOfMonth } = startEndOfMonth();
    const agentRole = await Role.findOne({ slug: 'agent' });
    const agentRoleId = agentRole ? agentRole._id : null;

    const [
      emiCollectedThisMonth,
      bvDistributedThisMonth,
      pvDistributedThisMonth,
      withdrawalsPaidThisMonth,
      newBookingsThisMonth,
      newAgentsThisMonth,
      totalEmiCollected,
      totalCommissionDistributed,
      totalPlotsSold,
      activeAgents,
      totalCustomers,
    ] = await Promise.all([
      sumAmount(Emi, { status: 'paid', paidDate: { $gte: startOfMonth, $lt: endOfMonth } }),
      sumAmount(WalletTransaction, {
        type: 'credit',
        category: { $in: ['emi_commission', 'rank_difference'] },
        pointsType: 'BV',
        createdAt: { $gte: startOfMonth, $lt: endOfMonth },
      }),
      sumAmount(WalletTransaction, {
        type: 'credit',
        category: { $in: ['emi_commission', 'rank_difference'] },
        pointsType: 'PV',
        createdAt: { $gte: startOfMonth, $lt: endOfMonth },
      }),
      sumAmount(WithdrawalRequest, { status: 'approved', reviewedAt: { $gte: startOfMonth, $lt: endOfMonth } }),
      Booking.countDocuments({ createdAt: { $gte: startOfMonth, $lt: endOfMonth } }),
      User.countDocuments({ role: agentRoleId, isKycVerified: true, createdAt: { $gte: startOfMonth, $lt: endOfMonth } }),
      sumAmount(Emi, { status: 'paid' }),
      sumAmount(WalletTransaction, { type: 'credit', category: { $in: ['emi_commission', 'rank_difference'] } }),
      Plot.countDocuments({ status: 'sold' }),
      User.countDocuments({ role: agentRoleId, status: 'active', isKycVerified: true }),
      Customer.countDocuments(),
    ]);

    return res.json({
      current_month: {
        emi_collected: emiCollectedThisMonth,
        bv_distributed: bvDistributedThisMonth,
        pv_distributed: pvDistributedThisMonth,
        withdrawals_paid: withdrawalsPaidThisMonth,
        new_bookings: newBookingsThisMonth,
        new_agents: newAgentsThisMonth,
      },
      all_time: {
        total_emi_collected: totalEmiCollected,
        total_commission_distributed: totalCommissionDistributed,
        total_plots_sold: totalPlotsSold,
        total_active_agents: activeAgents,
        total_customers: totalCustomers,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch overview stats.', error: err.message });
  }
}

async function buildEmiCollectionsQuery(filters) {
  const { date_from, date_to, project_id, agent_id, payment_mode, search } = filters;

  const query = { ...dateRangeFilter('paidDate', date_from, date_to) };
  if (agent_id) query.agent = agent_id;
  if (payment_mode && payment_mode !== 'all') query.paymentMode = payment_mode;

  if (project_id) {
    const bookingIds = await Booking.find({ project: project_id }).distinct('_id');
    query.booking = { $in: bookingIds };
  }

  if (search && search.trim()) {
    const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const [matchingCustomers, matchingAgents] = await Promise.all([
      Customer.find({ name: re }).distinct('_id'),
      User.find({ name: re }).distinct('_id'),
    ]);
    const searchBookingIds = await Booking.find({
      $or: [{ bookingNumber: re }, { customer: { $in: matchingCustomers } }, { agent: { $in: matchingAgents } }],
    }).distinct('_id');

    if (query.booking && query.booking.$in) {
      const existing = new Set(query.booking.$in.map(String));
      query.booking = { $in: searchBookingIds.filter((id) => existing.has(String(id))) };
    } else {
      query.booking = { $in: searchBookingIds };
    }
  }

  return query;
}

// GET /api/admin/reports/emi-collections
async function emiCollections(req, res) {
  try {
    const { status = 'all' } = req.query;
    const baseQuery = await buildEmiCollectionsQuery(req.query);

    const [totalEmis, totalCollected, cashCollected, onlineCollected, pendingAmount, overdueAmount] = await Promise.all([
      Emi.countDocuments(baseQuery),
      sumAmount(Emi, { ...baseQuery, status: 'paid' }),
      sumAmount(Emi, { ...baseQuery, status: 'paid', paymentMode: 'cash' }),
      sumAmount(Emi, { ...baseQuery, status: 'paid', paymentMode: { $in: ['upi', 'net_banking', 'bank_transfer', 'card'] } }),      sumAmount(Emi, { ...baseQuery, status: 'pending' }),
      sumAmount(Emi, { ...baseQuery, status: 'overdue' }),
    ]);

    const listQuery = status !== 'all' ? { ...baseQuery, status } : baseQuery;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [emis, total] = await Promise.all([
      Emi.find(listQuery)
        .populate({ path: 'booking', populate: [{ path: 'customer' }, { path: 'plot' }, { path: 'project' }, { path: 'agent', select: 'name' }] })
        .sort({ dueDate: -1 })
        .skip(skip)
        .limit(limit),
      Emi.countDocuments(listQuery),
    ]);

    return res.json({
      data: emis,
      meta: { page, limit, total, lastPage: Math.ceil(total / limit) },
      summary: {
        total_emis: totalEmis,
        total_collected: totalCollected,
        cash_collected: cashCollected,
        online_collected: onlineCollected,
        pending_amount: pendingAmount,
        overdue_amount: overdueAmount,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch EMI collections report.', error: err.message });
  }
}

// GET /api/admin/reports/emi-collections/export
async function emiCollectionsExport(req, res) {
  try {
    const { status = 'all' } = req.query;
    const baseQuery = await buildEmiCollectionsQuery(req.query);
    const listQuery = status !== 'all' ? { ...baseQuery, status } : baseQuery;

    const emis = await Emi.find(listQuery)
      .populate({ path: 'booking', populate: [{ path: 'customer' }, { path: 'plot' }, { path: 'project' }, { path: 'agent', select: 'name' }] })
      .sort({ dueDate: -1 });

    const headers = ['EMI #', 'Booking #', 'Customer', 'Project', 'Plot', 'Agent', 'Month #', 'Amount', 'Mode', 'Due Date', 'Paid Date', 'Status'];
    const rows = emis.map((e) => [
      e._id,
      e.booking?.bookingNumber || 'N/A',
      e.booking?.customer?.name || 'N/A',
      e.booking?.project?.name || 'N/A',
      e.booking?.plot?.plotNumber || 'N/A',
      e.booking?.agent?.name || 'N/A',
      e.emiNumber,
      e.amount,
      e.paymentMode || '-',
      e.dueDate ? e.dueDate.toISOString().slice(0, 10) : '-',
      e.paidDate ? e.paidDate.toISOString().slice(0, 10) : '-',
      e.status,
    ]);

    return sendCsv(res, `emi_collections_${timestamp()}.csv`, toCsv(headers, rows));
  } catch (err) {
    return res.status(500).json({ message: 'Failed to export EMI collections report.', error: err.message });
  }
}

async function buildCommissionsQuery(filters) {
  const { date_from, date_to, agent_id, category, points_type, booking_id, search } = filters;

  const query = { type: 'credit', ...dateRangeFilter('createdAt', date_from, date_to) };
  if (agent_id) query.agent = agent_id;
  if (category && category !== 'all') query.category = category;
  if (points_type && points_type !== 'all') query.pointsType = points_type;
  if (booking_id) query.booking = booking_id;

  if (search && search.trim()) {
    const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const [matchingAgents, matchingBookings] = await Promise.all([
      User.find({ name: re }).distinct('_id'),
      Booking.find({ bookingNumber: re }).distinct('_id'),
    ]);
    query.$or = [{ agent: { $in: matchingAgents } }, { booking: { $in: matchingBookings } }];
  }

  return query;
}

// GET /api/admin/reports/commissions
async function commissions(req, res) {
  try {
    const query = await buildCommissionsQuery(req.query);

    const [totalBv, totalPv, emiCommissions, rankDifference, uniqueAgents] = await Promise.all([
      sumAmount(WalletTransaction, { ...query, pointsType: 'BV' }),
      sumAmount(WalletTransaction, { ...query, pointsType: 'PV' }),
      sumAmount(WalletTransaction, { ...query, category: 'emi_commission' }),
      sumAmount(WalletTransaction, { ...query, category: 'rank_difference' }),
      WalletTransaction.distinct('agent', query),
    ]);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      WalletTransaction.find(query)
        .populate({ path: 'agent', select: 'name', populate: { path: 'rank' } })
        .populate({ path: 'booking', populate: { path: 'plot' } })
        .populate('emi')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      WalletTransaction.countDocuments(query),
    ]);

    return res.json({
      data: transactions,
      meta: { page, limit, total, lastPage: Math.ceil(total / limit) },
      summary: {
        total_bv: totalBv,
        total_pv: totalPv,
        emi_commissions: emiCommissions,
        rank_difference: rankDifference,
        agents_earning: uniqueAgents.length,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch commission report.', error: err.message });
  }
}

// GET /api/admin/reports/commissions/export
async function commissionsExport(req, res) {
  try {
    const query = await buildCommissionsQuery(req.query);

    const transactions = await WalletTransaction.find(query)
      .populate({ path: 'agent', select: 'name', populate: { path: 'rank' } })
      .populate({ path: 'booking', populate: { path: 'plot' } })
      .populate('emi')
      .sort({ createdAt: -1 });

    const headers = ['Date', 'Agent', 'Rank', 'Category', 'Booking#', 'Plot', 'EMI Month', 'BV Amount', 'PV Amount', 'Remark'];
    const rows = transactions.map((t) => [
      t.createdAt.toISOString().slice(0, 16).replace('T', ' '),
      t.agent?.name || 'N/A',
      t.agent?.rank?.abbreviation || 'N/A',
      t.category,
      t.booking?.bookingNumber || 'N/A',
      t.booking?.plot?.plotNumber || 'N/A',
      t.emi?.emiNumber || 'N/A',
      t.pointsType === 'BV' ? t.amount : 0,
      t.pointsType === 'PV' ? t.amount : 0,
      t.remark,
    ]);

    return sendCsv(res, `commissions_${timestamp()}.csv`, toCsv(headers, rows));
  } catch (err) {
    return res.status(500).json({ message: 'Failed to export commission report.', error: err.message });
  }
}

async function buildAgentEarningsData(filters) {
  const agentRole = await Role.findOne({ slug: 'agent' });
  const agentRoleId = agentRole ? agentRole._id : null;

  const { date_from, date_to, rank_id, min_earnings, search } = filters;

  const query = { role: agentRoleId, isKycVerified: true };
  if (rank_id) query.rank = rank_id;
  if (search && search.trim()) {
    const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: re }, { email: re }, { referralCode: re }];
  }

  const agents = await User.find(query).populate('rank').sort({ createdAt: -1 });

  const { start: monthStart, end: monthEnd } = startEndOfMonth();
  const periodFilter = date_from || date_to ? dateRangeFilter('createdAt', date_from, date_to) : { createdAt: { $gte: monthStart, $lt: monthEnd } };

  let enriched = await Promise.all(
    agents.map(async (agent) => {
      const [totalBvEarned, totalPvEarned, thisMonthBv, thisMonthPv, totalBookings] = await Promise.all([
        sumAmount(WalletTransaction, { agent: agent._id, type: 'credit', pointsType: 'BV' }),
        sumAmount(WalletTransaction, { agent: agent._id, type: 'credit', pointsType: 'PV' }),
        sumAmount(WalletTransaction, { agent: agent._id, type: 'credit', pointsType: 'BV', ...periodFilter }),
        sumAmount(WalletTransaction, { agent: agent._id, type: 'credit', pointsType: 'PV', ...periodFilter }),
        Booking.countDocuments({ agent: agent._id }),
      ]);

      return {
        ...agent.toObject(),
        total_bv_earned: totalBvEarned,
        total_pv_earned: totalPvEarned,
        this_month_bv: thisMonthBv,
        this_month_pv: thisMonthPv,
        total_bookings: totalBookings,
      };
    })
  );

  if (min_earnings) {
    enriched = enriched.filter((a) => a.total_bv_earned >= Number(min_earnings));
  }

  enriched.sort((a, b) => b.total_bv_earned - a.total_bv_earned);

  return enriched;
}

// GET /api/admin/reports/agent-earnings
async function agentEarnings(req, res) {
  try {
    const enriched = await buildAgentEarningsData(req.query);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const paged = enriched.slice(skip, skip + limit);

    const topBV = enriched[0] || null;
    const topPV = [...enriched].sort((a, b) => b.total_pv_earned - a.total_pv_earned)[0] || null;
    const totalAgentsEarning = enriched.filter((a) => a.total_bv_earned > 0).length;
    const totalBvPeriod = enriched.reduce((sum, a) => sum + a.this_month_bv, 0);
    const avgBV = enriched.length > 0 ? totalBvPeriod / enriched.length : 0;

    const ranks = await Rank.find().sort({ sortOrder: 1 });

    return res.json({
      data: paged,
      meta: { page, limit, total: enriched.length, lastPage: Math.ceil(enriched.length / limit) },
      summary: {
        top_earner_bv: topBV,
        top_earner_pv: topPV,
        avg_bv_this_month: avgBV,
        total_agents_earning: totalAgentsEarning,
      },
      ranks,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch agent earnings report.', error: err.message });
  }
}

// GET /api/admin/reports/agent-earnings/export
async function agentEarningsExport(req, res) {
  try {
    const enriched = await buildAgentEarningsData(req.query);

    const headers = ['Agent Name', 'Rank', 'Total Team', 'Total BV Earned', 'Total PV Earned', 'This Month BV', 'This Month PV', 'Total Bookings', 'Joined Date'];
    const rows = enriched.map((a) => [
      a.name,
      a.rank?.name || 'N/A',
      a.totalTeamSize || 0,
      a.total_bv_earned || 0,
      a.total_pv_earned || 0,
      a.this_month_bv || 0,
      a.this_month_pv || 0,
      a.total_bookings || 0,
      new Date(a.createdAt).toISOString().slice(0, 10),
    ]);

    return sendCsv(res, `agent_earnings_${timestamp()}.csv`, toCsv(headers, rows));
  } catch (err) {
    return res.status(500).json({ message: 'Failed to export agent earnings report.', error: err.message });
  }
}

async function buildProjectSalesData(filters) {
  const { project_id, date_from, date_to, status, search } = filters;

  const projectQuery = {};
  if (project_id) projectQuery._id = project_id;
  if (status && status !== 'all') projectQuery.status = status;

  const projects = await Project.find(projectQuery).sort({ name: 1 });

  const enrichedProjects = await Promise.all(
    projects.map(async (project) => {
      const [totalPlots, availablePlots, bookedPlots, soldPlots] = await Promise.all([
        Plot.countDocuments({ project: project._id }),
        Plot.countDocuments({ project: project._id, status: 'available' }),
        Plot.countDocuments({ project: project._id, status: 'booked' }),
        Plot.countDocuments({ project: project._id, status: 'sold' }),
      ]);

      const revenueQuery = { project: project._id, approvalStatus: 'approved', ...dateRangeFilter('bookingDate', date_from, date_to) };
      const totalRevenue = await sumAmount(Booking, revenueQuery, 'totalAmount');
      const bookingCollected = await sumAmount(Booking, { project: project._id, approvalStatus: 'approved' }, 'bookingAmount');

      const bookingIds = await Booking.find({ project: project._id, approvalStatus: 'approved' }).distinct('_id');
      const paidEmis = await sumAmount(Emi, { booking: { $in: bookingIds }, status: 'paid' });

      const collectedAmount = bookingCollected + paidEmis;
      const pendingAmount = totalRevenue - collectedAmount;

      return {
        ...project.toObject(),
        total_plots: totalPlots,
        available_plots: availablePlots,
        booked_plots: bookedPlots,
        sold_plots: soldPlots,
        total_revenue: totalRevenue,
        collected_amount: collectedAmount,
        pending_amount: pendingAmount,
      };
    })
  );

  const summary = {
    total_revenue: enrichedProjects.reduce((s, p) => s + p.total_revenue, 0),
    total_collected: enrichedProjects.reduce((s, p) => s + p.collected_amount, 0),
    total_pending: enrichedProjects.reduce((s, p) => s + p.pending_amount, 0),
    total_plots_sold: enrichedProjects.reduce((s, p) => s + p.sold_plots, 0),
  };

  const bookingsQuery = { approvalStatus: 'approved', ...dateRangeFilter('bookingDate', date_from, date_to) };
  if (project_id) bookingsQuery.project = project_id;

  if (search && search.trim()) {
    const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const [matchingCustomers, matchingAgents] = await Promise.all([
      Customer.find({ name: re }).distinct('_id'),
      User.find({ name: re }).distinct('_id'),
    ]);
    bookingsQuery.$or = [{ bookingNumber: re }, { customer: { $in: matchingCustomers } }, { agent: { $in: matchingAgents } }];
  }

  return { enrichedProjects, summary, bookingsQuery };
}

// GET /api/admin/reports/project-sales
async function projectSales(req, res) {
  try {
    const { enrichedProjects, summary, bookingsQuery } = await buildProjectSalesData(req.query);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find(bookingsQuery).populate('customer').populate('plot').populate('project').populate('agent', 'name').sort({ bookingDate: -1 }).skip(skip).limit(limit),
      Booking.countDocuments(bookingsQuery),
    ]);

    return res.json({
      projects: enrichedProjects,
      bookings: { data: bookings, meta: { page, limit, total, lastPage: Math.ceil(total / limit) } },
      summary,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch project sales report.', error: err.message });
  }
}

// GET /api/admin/reports/project-sales/export
async function projectSalesExport(req, res) {
  try {
    const { bookingsQuery } = await buildProjectSalesData(req.query);

    const bookings = await Booking.find(bookingsQuery).populate('customer').populate('plot').populate('project').populate('agent', 'name').sort({ bookingDate: -1 });

    const headers = ['Booking #', 'Customer', 'Project', 'Plot', 'Agent', 'Total Amount', 'Booking Amount', 'EMI Amount', 'Months', 'Status', 'Date'];
    const rows = bookings.map((b) => [
      b.bookingNumber,
      b.customer?.name || 'N/A',
      b.project?.name || 'N/A',
      b.plot?.plotNumber || 'N/A',
      b.agent?.name || 'N/A',
      b.totalAmount,
      b.bookingAmount,
      b.emiAmount || 0,
      b.emiMonths || 0,
      b.approvalStatus,
      b.bookingDate.toISOString().slice(0, 10),
    ]);

    return sendCsv(res, `project_sales_${timestamp()}.csv`, toCsv(headers, rows));
  } catch (err) {
    return res.status(500).json({ message: 'Failed to export project sales report.', error: err.message });
  }
}

async function buildPayoutsQuery(filters) {
  const { date_from, date_to, agent_id, points_type, search } = filters;

  const query = { ...dateRangeFilter('createdAt', date_from, date_to) };
  if (agent_id) query.agent = agent_id;
  if (points_type && points_type !== 'all') query.pointsType = points_type;

  if (search && search.trim()) {
    const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const matchingAgents = await User.find({ name: re }).distinct('_id');
    query.agent = query.agent ? query.agent : { $in: matchingAgents };
  }

  return query;
}

// GET /api/admin/reports/payouts
async function payouts(req, res) {
  try {
    const { status = 'all' } = req.query;
    const baseQuery = await buildPayoutsQuery(req.query);

    const [
      requestedCount,
      requestedSum,
      approvedCount,
      approvedSum,
      tdsDeducted,
      rejectedCount,
      rejectedSum,
      pendingCount,
      pendingSum,
      bvPayouts,
      pvPayouts,
    ] = await Promise.all([
      WithdrawalRequest.countDocuments(baseQuery),
      sumAmount(WithdrawalRequest, baseQuery),
      WithdrawalRequest.countDocuments({ ...baseQuery, status: 'approved' }),
      sumAmount(WithdrawalRequest, { ...baseQuery, status: 'approved' }, 'netAmount'),
      sumAmount(WithdrawalRequest, { ...baseQuery, status: 'approved' }, 'tdsAmount'),
      WithdrawalRequest.countDocuments({ ...baseQuery, status: 'rejected' }),
      sumAmount(WithdrawalRequest, { ...baseQuery, status: 'rejected' }),
      WithdrawalRequest.countDocuments({ ...baseQuery, status: 'pending' }),
      sumAmount(WithdrawalRequest, { ...baseQuery, status: 'pending' }),
      sumAmount(WithdrawalRequest, { ...baseQuery, status: 'approved', pointsType: 'BV' }, 'netAmount'),
      sumAmount(WithdrawalRequest, { ...baseQuery, status: 'approved', pointsType: 'PV' }, 'netAmount'),
    ]);

    const listQuery = status !== 'all' ? { ...baseQuery, status } : baseQuery;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      WithdrawalRequest.find(listQuery)
        .populate({ path: 'agent', select: 'name', populate: { path: 'rank' } })
        .populate('reviewedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      WithdrawalRequest.countDocuments(listQuery),
    ]);

    return res.json({
      data: list,
      meta: { page, limit, total, lastPage: Math.ceil(total / limit) },
      summary: {
        requested_count: requestedCount,
        requested_sum: requestedSum,
        approved_count: approvedCount,
        approved_sum: approvedSum,
        tds_deducted: tdsDeducted,
        rejected_count: rejectedCount,
        rejected_sum: rejectedSum,
        pending_count: pendingCount,
        pending_sum: pendingSum,
        bv_payouts: bvPayouts,
        pv_payouts: pvPayouts,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch payouts report.', error: err.message });
  }
}

// GET /api/admin/reports/payouts/export
async function payoutsExport(req, res) {
  try {
    const { status = 'all' } = req.query;
    const baseQuery = await buildPayoutsQuery(req.query);
    const listQuery = status !== 'all' ? { ...baseQuery, status } : baseQuery;

    const list = await WithdrawalRequest.find(listQuery)
      .populate({ path: 'agent', select: 'name', populate: { path: 'rank' } })
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    const headers = ['Request #', 'Agent', 'Rank', 'Type (BV/PV)', 'Requested Amount', 'TDS', 'Net Amount', 'Status', 'Requested Date', 'Approved Date', 'Payment Reference', 'Reviewed By'];
    const rows = list.map((p) => [
      p._id,
      p.agent?.name || 'N/A',
      p.agent?.rank?.abbreviation || 'N/A',
      p.pointsType,
      p.amount,
      p.tdsAmount,
      p.netAmount,
      p.status,
      p.requestedAt ? p.requestedAt.toISOString().slice(0, 16).replace('T', ' ') : '-',
      p.reviewedAt ? p.reviewedAt.toISOString().slice(0, 16).replace('T', ' ') : '-',
      p.paymentReference || '-',
      p.reviewedBy?.name || 'N/A',
    ]);

    return sendCsv(res, `payouts_${timestamp()}.csv`, toCsv(headers, rows));
  } catch (err) {
    return res.status(500).json({ message: 'Failed to export payouts report.', error: err.message });
  }
}

// ============ DATE RANGE REPORT ============
// Builds a flat list of PAID transactions (booking token + every paid EMI
// line) in the range — mirrors the reference app's "Date range report"
// which shows one row per payment received, not per booking.
async function buildDateRangeTransactions(filters) {
  const { date_from, date_to, project_id, sort_by = 'paidOn', order = 'desc' } = filters;

  const emiDateFilter = dateRangeFilter('paidDate', date_from, date_to);
  const emiQuery = { status: 'paid', ...emiDateFilter };
  if (project_id) {
    const bookingIds = await Booking.find({ project: project_id }).distinct('_id');
    emiQuery.booking = { $in: bookingIds };
  }

  const emis = await Emi.find(emiQuery)
    .populate('bank', 'name')
    .populate({
      path: 'booking',
      populate: [
        { path: 'project', select: 'name' },
        { path: 'plot', select: 'plotNumber totalArea' },
        { path: 'customer', select: 'name' },
      ],
    });

  const transactions = emis
    .filter((e) => e.booking)
    .map((e) => ({
      paidOn: e.paidDate,
      reference: e.receiptId || e.paymentReference || '-',
      client: e.booking.customer?.name || 'N/A',
      project: e.booking.project?.name || 'N/A',
      plot: e.booking.plot?.plotNumber || 'N/A',
      area: e.booking.plot?.totalArea || 0,
      purpose:
        e.emiNumber === 0 ? 'booking' : e.emiNumber === -1 ? 'down payment' : e.emiNumber === -2 ? 'down payment 2' : e.emiNumber === 99 ? 'registry' : 'installment',
      method: e.paymentMode || 'N/A',
      bank: e.bank?.name || '-',
      amount: e.amount || 0,
      note: e.remarks || '-',
    }));

  const dir = order === 'asc' ? 1 : -1;
  transactions.sort((a, b) => {
    if (sort_by === 'amount') return (a.amount - b.amount) * dir;
    return (new Date(a.paidOn) - new Date(b.paidOn)) * dir;
  });

  return transactions;
}

function summarizeTransactions(transactions) {
  const cashReceived = transactions.filter((t) => t.method === 'cash').reduce((s, t) => s + t.amount, 0);
  const bankTransferReceived = transactions
    .filter((t) => ['upi', 'net_banking', 'bank_transfer', 'card'].includes(t.method))
    .reduce((s, t) => s + t.amount, 0);
  const chequeReceived = transactions.filter((t) => t.method === 'cheque').reduce((s, t) => s + t.amount, 0);
  const totalCollected = transactions.reduce((s, t) => s + t.amount, 0);

  return {
    transactions_count: transactions.length,
    total_collected: totalCollected,
    cash_received: cashReceived,
    bank_transfer_received: bankTransferReceived,
    cheque_received: chequeReceived,
  };
}

// GET /api/admin/reports/date-range
async function dateRangeReport(req, res) {
  try {
    const { date_from, date_to } = req.query;
    if (!date_from || !date_to) {
      return res.status(400).json({ message: 'date_from and date_to are required' });
    }

    const transactions = await buildDateRangeTransactions(req.query);
    const summary = summarizeTransactions(transactions);

    return res.json({
      range: { from: date_from, to: date_to },
      summary,
      transactions,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch date range report.', error: err.message });
  }
}

// GET /api/admin/reports/date-range/export
async function dateRangeReportExport(req, res) {
  try {
    const transactions = await buildDateRangeTransactions(req.query);

    const headers = ['Paid On', 'Reference', 'Client', 'Project', 'Plot', 'Area', 'Purpose', 'Method', 'Bank', 'Amount', 'Note'];
    const rows = transactions.map((t) => [
      t.paidOn ? t.paidOn.toISOString().slice(0, 10) : '-',
      t.reference,
      t.client,
      t.project,
      t.plot,
      t.area,
      t.purpose,
      t.method,
      t.bank,
      t.amount,
      t.note,
    ]);

    return sendCsv(res, `date_range_report_${timestamp()}.csv`, toCsv(headers, rows));
  } catch (err) {
    return res.status(500).json({ message: 'Failed to export date range report.', error: err.message });
  }
}

// ============ MONTH-END REPORT ============
// GET /api/admin/reports/month-end?month=YYYY-MM
async function monthEndReport(req, res) {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'month is required in YYYY-MM format' });
    }
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 1);

    const [
      newBookings,
      newBookingValue,
      emiDueThisMonth,
      emiPaidThisMonth,
      emiOverdueAtMonthEnd,
      commissionBV,
      commissionPV,
      withdrawalsPaid,
      plotsSoldThisMonth,
      cancelledThisMonth,
    ] = await Promise.all([
      Booking.countDocuments({ createdAt: { $gte: start, $lt: end } }),
      sumAmount(Booking, { createdAt: { $gte: start, $lt: end } }, 'totalAmount'),
      Emi.countDocuments({ dueDate: { $gte: start, $lt: end } }),
      sumAmount(Emi, { status: 'paid', paidDate: { $gte: start, $lt: end } }),
      Emi.countDocuments({ status: 'overdue', dueDate: { $lt: end } }),
      sumAmount(WalletTransaction, { type: 'credit', category: { $in: ['emi_commission', 'rank_difference'] }, pointsType: 'BV', createdAt: { $gte: start, $lt: end } }),
      sumAmount(WalletTransaction, { type: 'credit', category: { $in: ['emi_commission', 'rank_difference'] }, pointsType: 'PV', createdAt: { $gte: start, $lt: end } }),
      sumAmount(WithdrawalRequest, { status: 'approved', reviewedAt: { $gte: start, $lt: end } }),
      Plot.countDocuments({ status: 'sold', updatedAt: { $gte: start, $lt: end } }),
      Booking.countDocuments({ status: 'cancelled', updatedAt: { $gte: start, $lt: end } }),
    ]);

    return res.json({
      month,
      new_bookings: newBookings,
      new_booking_value: newBookingValue,
      emi_due_this_month: emiDueThisMonth,
      emi_collected_this_month: emiPaidThisMonth,
      emi_overdue_at_month_end: emiOverdueAtMonthEnd,
      commission_bv: commissionBV,
      commission_pv: commissionPV,
      withdrawals_paid: withdrawalsPaid,
      plots_sold: plotsSoldThisMonth,
      bookings_cancelled: cancelledThisMonth,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch month-end report.', error: err.message });
  }
}

// ============ SINGLE UNIT REPORT ============
// GET /api/admin/reports/single-unit/search?query=
async function singleUnitSearch(req, res) {
  try {
    const { query } = req.query;
    if (!query || !query.trim()) return res.json([]);
    const re = new RegExp(query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const plots = await Plot.find({ plotNumber: re }).populate('project', 'name').limit(15);
    return res.json(plots);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to search plots.', error: err.message });
  }
}

// GET /api/admin/reports/single-unit?plot_id=
async function singleUnitReport(req, res) {
  try {
    const { plot_id } = req.query;
    if (!plot_id) return res.status(400).json({ message: 'plot_id is required' });

    const plot = await Plot.findById(plot_id).populate('project', 'name');
    if (!plot) return res.status(404).json({ message: 'Plot not found' });

    const bookings = await Booking.find({ plot: plot_id })
      .populate('customer', 'name email phone')
      .populate('agent', 'name')
      .sort({ createdAt: -1 });

    const bookingIds = bookings.map((b) => b._id);
    const emis = await Emi.find({ booking: { $in: bookingIds } }).sort({ emiNumber: 1 });
    const commissionTxns = await WalletTransaction.find({ booking: { $in: bookingIds }, category: 'emi_commission' })
      .populate('agent', 'name')
      .sort({ createdAt: -1 });

    return res.json({
      plot,
      bookings,
      emis,
      commission_transactions: commissionTxns,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch single unit report.', error: err.message });
  }
}

// ============ CANCELLED BOOKINGS REPORT ============
async function buildCancelledBookingsQuery(filters) {
  const { date_from, date_to, project_id, type = 'all' } = filters;
  const query = { ...dateRangeFilter('updatedAt', date_from, date_to) };
  if (project_id) query.project = project_id;

  if (type === 'cancelled') query.status = 'cancelled';
  else if (type === 'rejected') query.approvalStatus = 'rejected';
  else query.$or = [{ status: 'cancelled' }, { approvalStatus: 'rejected' }];

  return query;
}

// GET /api/admin/reports/cancelled-bookings
async function cancelledBookings(req, res) {
  try {
    const query = await buildCancelledBookingsQuery(req.query);

    const [totalCount, totalValue] = await Promise.all([
      Booking.countDocuments(query),
      sumAmount(Booking, query, 'totalAmount'),
    ]);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('customer', 'name')
        .populate('plot', 'plotNumber')
        .populate('project', 'name')
        .populate('agent', 'name')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(query),
    ]);

    return res.json({
      data: bookings,
      meta: { page, limit, total, lastPage: Math.ceil(total / limit) },
      summary: { total_cancelled: totalCount, total_value: totalValue },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch cancelled bookings report.', error: err.message });
  }
}

// GET /api/admin/reports/cancelled-bookings/export
async function cancelledBookingsExport(req, res) {
  try {
    const query = await buildCancelledBookingsQuery(req.query);
    const bookings = await Booking.find(query)
      .populate('customer', 'name')
      .populate('plot', 'plotNumber')
      .populate('project', 'name')
      .populate('agent', 'name')
      .sort({ updatedAt: -1 });

    const headers = ['Booking #', 'Customer', 'Project', 'Plot', 'Agent', 'Total Amount', 'Status', 'Approval Status', 'Rejection/Cancellation Reason', 'Updated At'];
    const rows = bookings.map((b) => [
      b.bookingNumber,
      b.customer?.name || 'N/A',
      b.project?.name || 'N/A',
      b.plot?.plotNumber || 'N/A',
      b.agent?.name || 'N/A',
      b.totalAmount,
      b.status,
      b.approvalStatus,
      b.rejectionReason || b.approvalReason || '-',
      b.updatedAt.toISOString().slice(0, 10),
    ]);

    return sendCsv(res, `cancelled_bookings_${timestamp()}.csv`, toCsv(headers, rows));
  } catch (err) {
    return res.status(500).json({ message: 'Failed to export cancelled bookings report.', error: err.message });
  }
}

// ============ EXECUTIVE TDS REPORT ============
async function buildExecutiveTdsQuery(filters) {
  const { date_from, date_to, agent_id } = filters;
  const query = { status: 'approved', ...dateRangeFilter('reviewedAt', date_from, date_to) };
  if (agent_id) query.agent = agent_id;
  return query;
}

// GET /api/admin/reports/executive-tds
async function executiveTds(req, res) {
  try {
    const query = await buildExecutiveTdsQuery(req.query);

    const grouped = await WithdrawalRequest.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$agent',
          totalGross: { $sum: '$amount' },
          totalTds: { $sum: '$tdsAmount' },
          totalNet: { $sum: '$netAmount' },
          withdrawalCount: { $sum: 1 },
        },
      },
      { $sort: { totalTds: -1 } },
    ]);

    const agentIds = grouped.map((g) => g._id);
    const agents = await User.find({ _id: { $in: agentIds } }).select('name email');
    const agentMap = Object.fromEntries(agents.map((a) => [String(a._id), a]));

    const data = grouped.map((g) => ({
      agent: agentMap[String(g._id)] || { name: 'N/A' },
      total_gross: g.totalGross,
      total_tds: g.totalTds,
      total_net: g.totalNet,
      withdrawal_count: g.withdrawalCount,
    }));

    const summary = data.reduce(
      (acc, d) => ({
        total_gross: acc.total_gross + d.total_gross,
        total_tds: acc.total_tds + d.total_tds,
        total_net: acc.total_net + d.total_net,
        total_agents: acc.total_agents + 1,
      }),
      { total_gross: 0, total_tds: 0, total_net: 0, total_agents: 0 }
    );

    return res.json({ data, summary });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch executive TDS report.', error: err.message });
  }
}

// GET /api/admin/reports/executive-tds/export
async function executiveTdsExport(req, res) {
  try {
    const query = await buildExecutiveTdsQuery(req.query);

    const grouped = await WithdrawalRequest.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$agent',
          totalGross: { $sum: '$amount' },
          totalTds: { $sum: '$tdsAmount' },
          totalNet: { $sum: '$netAmount' },
          withdrawalCount: { $sum: 1 },
        },
      },
      { $sort: { totalTds: -1 } },
    ]);

    const agentIds = grouped.map((g) => g._id);
    const agents = await User.find({ _id: { $in: agentIds } }).select('name email');
    const agentMap = Object.fromEntries(agents.map((a) => [String(a._id), a]));

    const headers = ['Executive', 'Email', 'Withdrawals', 'Gross Amount', 'TDS Deducted', 'Net Paid'];
    const rows = grouped.map((g) => {
      const agent = agentMap[String(g._id)] || {};
      return [agent.name || 'N/A', agent.email || 'N/A', g.withdrawalCount, g.totalGross, g.totalTds, g.totalNet];
    });

    return sendCsv(res, `executive_tds_${timestamp()}.csv`, toCsv(headers, rows));
  } catch (err) {
    return res.status(500).json({ message: 'Failed to export executive TDS report.', error: err.message });
  }
}

module.exports = {
  overview,
  emiCollections,
  emiCollectionsExport,
  commissions,
  commissionsExport,
  agentEarnings,
  agentEarningsExport,
  projectSales,
  projectSalesExport,
  payouts,
  payoutsExport,
  dateRangeReport,
  dateRangeReportExport,
  monthEndReport,
  singleUnitSearch,
  singleUnitReport,
  cancelledBookings,
  cancelledBookingsExport,
  executiveTds,
  executiveTdsExport,
};