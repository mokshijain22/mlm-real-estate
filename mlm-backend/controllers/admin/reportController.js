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
const Bank = require('../../models/Bank');
const commissionService = require('../../services/commissionService');
const treeBuilderService = require('../../services/treeBuilderService');
const rankService = require('../../services/rankService');
const settingService = require('../../services/settingService');

/**
 * For every real 'emi_commission' wallet transaction (one per EMI / combined
 * deposit — the seller's own payout), compute the matching virtual "Company"
 * row: sqftPortion (from the linked Emi/deposit) × company's per-sqft share
 * (Project pool minus the top executive's slab). No wallet record exists for
 * this — it's computed fresh every time the report loads.
 */
/**
 * Computes the virtual "Company" row for each real 'emi_commission' wallet
 * transaction (the seller's own payout — one per EMI / combined deposit),
 * reading the companyRatePerSqft snapshotted on that booking at creation time.
 * No wallet record exists for Company — this is computed fresh every time.
 */
async function buildCompanyRows(transactions) {
  const companyRows = [];
  const companyDisplayName = await settingService.get('site_title', 'Company');

  for (const t of transactions) {
    if (t.category !== 'emi_commission' || !t.booking) continue;

    // Read the rate snapshotted on the booking at creation time — never
    // recompute from today's Project pool, so a later rate change can't alter
    // what Company already earned on this booking.
    const booking = await Booking.findById(t.booking._id || t.booking).select('companyRatePerSqft bookingNumber');
    if (!booking) continue;

    const companyRate = Number(booking.companyRatePerSqft) || 0;
    if (companyRate <= 0) continue;

    // t.sqftPortion is the source of truth (correctly covers the combined
    // Deposit+DownPayment payout too). Old transactions from before this field
    // existed fall back to emi.sqftPortion, which is only accurate for regular
    // single-EMI credits.
    const sqftPortion = t.sqftPortion != null ? Number(t.sqftPortion) : Number(t.emi?.sqftPortion) || 0;
    const amount = sqftPortion * companyRate;
    if (amount <= 0) continue;

    companyRows.push({
      _id: `company-${t._id}`,
      isCompany: true,
      agent: { name: companyDisplayName },
      type: 'credit',
      category: 'company_commission',
      pointsType: t.pointsType,
      amount,
      booking: t.booking,
      emi: t.emi,
      remark: `Company share - ${t.booking?.bookingNumber || ''}`,
      createdAt: t.createdAt,
    });
  }

  return companyRows;
}

/**
 * Sums Company's commission across EVERY matching 'emi_commission' transaction
 * in the filtered report (not just the current page) — used for the summary
 * card so it reports an accurate total rather than a page-local one.
 */
async function computeCompanyTotal(query) {
  const emiTxns = await WalletTransaction.find({ ...query, category: 'emi_commission' })
    .select('booking emi')
    .populate('emi');

  const rows = await buildCompanyRows(emiTxns);
  return rows.reduce((s, r) => s + r.amount, 0);
}

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
    const { status = 'all', group_by } = req.query;
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

    // "Group by Booking" view — collapses every EMI line for a booking into
    // one summary row. Runs over ALL matching lines (not just one page) so a
    // booking's EMIs spread across what would've been multiple pages still
    // collapse into a single accurate row.
    if (group_by === 'booking') {
      const allLines = await Emi.find(listQuery)
        .populate({ path: 'booking', populate: [{ path: 'customer' }, { path: 'plot' }, { path: 'project' }, { path: 'agent', select: 'name' }] })
        .sort({ dueDate: -1 });

      const groupedMap = new Map();
      for (const e of allLines) {
        const key = e.booking?._id ? String(e.booking._id) : `no-booking-${e._id}`;
        if (!groupedMap.has(key)) {
          groupedMap.set(key, {
            _id: key,
            bookingId: e.booking?._id || null,
            bookingNumber: e.booking?.bookingNumber || null,
            customer: e.booking?.customer?.name || null,
            project: e.booking?.project?.name || null,
            plot: e.booking?.plot?.plotNumber || null,
            agent: e.booking?.agent?.name || null,
            lineCount: 0,
            paidCount: 0,
            totalAmount: 0,
            collectedAmount: 0,
            latestPaidDate: null,
            nearestDueDate: e.dueDate,
          });
        }
        const g = groupedMap.get(key);
        g.lineCount += 1;
        g.totalAmount += e.amount || 0;
        if (e.status === 'paid') {
          g.paidCount += 1;
          g.collectedAmount += e.amount || 0;
          if (!g.latestPaidDate || (e.paidDate && e.paidDate > g.latestPaidDate)) g.latestPaidDate = e.paidDate;
        }
        if (e.dueDate < g.nearestDueDate) g.nearestDueDate = e.dueDate;
      }
      const grouped = Array.from(groupedMap.values()).sort((a, b) => new Date(b.nearestDueDate) - new Date(a.nearestDueDate));
      const groupedTotal = grouped.length;
      const groupedPage = grouped.slice(skip, skip + limit);

      return res.json({
        data: groupedPage,
        grouped: true,
        meta: { page, limit, total: groupedTotal, lastPage: Math.ceil(groupedTotal / limit) },
        summary: {
          total_emis: totalEmis,
          total_collected: totalCollected,
          cash_collected: cashCollected,
          online_collected: onlineCollected,
          pending_amount: pendingAmount,
          overdue_amount: overdueAmount,
        },
      });
    }

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
      grouped: false,
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

    const emiLabel = (n) => {
      if (n === 0) return 'Booking Amount';
      if (n === -1) return 'Down Payment';
      if (n === -2) return 'Down Payment 2';
      if (n === 99) return 'Registry';
      if (n > 0) return `EMI Month ${n}`;
      return `Step ${n}`;
    };

    const headers = ['EMI #', 'Booking #', 'Customer', 'Project', 'Plot', 'Agent', 'Month', 'Amount', 'Mode', 'Due Date', 'Paid Date', 'Status'];
    const rows = emis.map((e) => [
      e._id,
      e.booking?.bookingNumber || 'N/A',
      e.booking?.customer?.name || 'N/A',
      e.booking?.project?.name || 'N/A',
      e.booking?.plot?.plotNumber || 'N/A',
      e.booking?.agent?.name || 'N/A',
      emiLabel(e.emiNumber),
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

// GET /api/admin/reports/booked-plots
async function bookedPlots(req, res) {
  try {
    const { project_id, date_from, date_to } = req.query;
    const bookingQuery = { status: { $in: ['active', 'completed', 'cancelled'] } };
    if (project_id) bookingQuery.project = project_id;
    Object.assign(bookingQuery, dateRangeFilter('createdAt', date_from, date_to));

    const bookings = await Booking.find(bookingQuery)
      .populate('customer', 'name mobile')
      .populate('plot', 'plotNumber totalArea plotDimensions')
      .populate('project', 'name')
      .sort({ createdAt: -1 });

    const bookingIds = bookings.map((b) => b._id);
    const emis = await Emi.find({ booking: { $in: bookingIds }, status: 'paid' });

    const paidByBooking = {};
    for (const e of emis) {
      const key = String(e.booking);
      if (!paidByBooking[key]) paidByBooking[key] = { received: 0, cash: 0, bank: 0, cheque: 0, bankNames: new Set() };
      const bucket = paidByBooking[key];
      bucket.received += e.amount || 0;
      if (e.paymentMode === 'cash') bucket.cash += e.amount || 0;
      else if (e.paymentMode === 'cheque') bucket.cheque += e.amount || 0;
      else bucket.bank += e.amount || 0;
    }
    const banksByBooking = {};
    const bankIds = emis.filter((e) => e.bank).map((e) => e.bank);
    if (bankIds.length) {
      const banks = await Bank.find({ _id: { $in: bankIds } }).select('name');
      const bankMap = {};
      banks.forEach((b) => (bankMap[String(b._id)] = b.name));
      for (const e of emis) {
        if (!e.bank) continue;
        const key = String(e.booking);
        if (!banksByBooking[key]) banksByBooking[key] = new Set();
        banksByBooking[key].add(bankMap[String(e.bank)] || '');
      }
    }

    const rows = bookings.map((b) => {
      const key = String(b._id);
      const p = paidByBooking[key] || { received: 0, cash: 0, bank: 0, cheque: 0 };
      const bankNames = banksByBooking[key] ? Array.from(banksByBooking[key]).filter(Boolean).join(', ') : '-';
      return {
        plot: b.plot?.plotNumber || 'N/A',
        area: b.plot?.plotDimensions ? `${b.plot.totalArea} (${b.plot.plotDimensions})` : b.plot?.totalArea || 'N/A',
        project: b.project?.name || 'N/A',
        client: b.customer?.name || 'N/A',
        mobile: b.customer?.mobile || 'N/A',
        status: b.status === 'active' ? 'Booked' : b.status === 'completed' ? 'Completed' : 'Cancelled',
        bookingDate: b.createdAt,
        sellingPrice: b.totalAmount || 0,
        dpAmount: (b.downPaymentAmount || 0) + (b.bookingAmount || 0),
        received: p.received,
        cash: p.cash,
        bank: p.bank,
        cheque: p.cheque,
        bankAccount: bankNames,
      };
    });

    const summary = {
      booked_plots: rows.filter((r) => r.status === 'Booked' || r.status === 'Completed').length,
      cancelled_plots: rows.filter((r) => r.status === 'Cancelled').length,
      total_selling_price: rows.reduce((s, r) => s + r.sellingPrice, 0),
      total_received: rows.reduce((s, r) => s + r.received, 0),
    };

    return res.json({ data: rows, summary });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch booked plots report.', error: err.message });
  }
}

// GET /api/admin/reports/booked-plots/export
async function bookedPlotsExport(req, res) {
  try {
    req.query.page = undefined;
    const fakeRes = { json: (data) => data, status: () => fakeRes };
    const result = await bookedPlots(req, fakeRes);
    const rows = result?.data || [];

    const headers = ['Plot', 'Area', 'Project', 'Client', 'Mobile', 'Status', 'Booking Date', 'Selling Price', 'DP Amount', 'Received', 'Cash', 'Bank', 'Cheque', 'Bank Account'];
    const csvRows = rows.map((r) => [
      r.plot, r.area, r.project, r.client, r.mobile, r.status,
      r.bookingDate ? new Date(r.bookingDate).toISOString().slice(0, 10) : '-',
      r.sellingPrice, r.dpAmount, r.received, r.cash, r.bank, r.cheque, r.bankAccount,
    ]);
    return sendCsv(res, `booked_plots_${timestamp()}.csv`, toCsv(headers, csvRows));
  } catch (err) {
    return res.status(500).json({ message: 'Failed to export booked plots report.', error: err.message });
  }
}

// --- Executive Commission Report helpers ---

// Builds { [agentIdString]: levelNumber } where the selling agent itself is
// Level 1, their direct referrer is Level 2, and so on up the upline chain.
async function buildLevelMap(sellingAgent) {
  const levelMap = { [String(sellingAgent._id)]: 1 };
  const uplineChain = await treeBuilderService.getUplineChain(sellingAgent);
  let level = 2;
  for (const uplineId of Object.values(uplineChain)) {
    levelMap[String(uplineId)] = level;
    level++;
  }
  return levelMap;
}

// Mirrors commissionService.processEmiCommission's math but WITHOUT writing
// any wallet records — used to show what an already-paid-but-not-yet-processed
// EMI (commissionProcessed: false) WOULD earn, so it can appear as "Pending".
async function computePendingCommissionRows(emi, booking) {
  if (!booking.agent) return [];
  const sellingAgent = booking.agent;
  const mode = emi.paymentMode || booking.paymentMode;
  const sqftPortion = Number(emi.sqftPortion) || 0;
  const { isOnlineMode } = require('../../utils/paymentModes');
  const ptype = isOnlineMode(mode) ? 'BV' : 'PV';
  const multiplier = await settingService.get(`${ptype.toLowerCase()}_per_sqft`, 1.0);

  let bookingRank = booking.agentRank;
  if (!bookingRank) bookingRank = await Rank.findOne().sort({ sortOrder: 1 });

  const sellerPoints = ptype === 'BV' ? Number(bookingRank?.bvPoints || 0) : Number(bookingRank?.pvPoints || 0);
  const cap = Number(booking.commissionCapPerSqft) || 0;
  const sellerEarning = cap > 0 ? Math.min(sqftPortion * sellerPoints * multiplier, sqftPortion * cap) : sqftPortion * sellerPoints * multiplier;

  const rows = [{ agentId: String(sellingAgent._id), amount: sellerEarning }];

  const uplineChain = await treeBuilderService.getUplineChain(sellingAgent);
  const uplineCaps = booking.uplineCommissionCapsPerSqft || [];
  let previousRankPoints = sellerPoints;
  let uplineRowIndex = 0;
  for (const uplineId of Object.values(uplineChain)) {
    const uplineAgent = await User.findById(uplineId).populate('rank');
    if (!uplineAgent) continue;
    const uplinePoints = await rankService.getAgentRankPoints(uplineAgent, ptype);
    const difference = uplinePoints - previousRankPoints;
    if (difference > 0) {
      const rawCommission = sqftPortion * difference * multiplier;
      const uplineCap = Number(uplineCaps[uplineRowIndex]) || 0;
      const commission = uplineCap > 0 ? Math.min(rawCommission, sqftPortion * uplineCap) : rawCommission;
      rows.push({ agentId: String(uplineAgent._id), amount: commission });
      previousRankPoints = uplinePoints;
      uplineRowIndex++;
    }
  }
  return rows;
}

function levelLabel(level) {
  return `Level ${level} (L${level})`;
}

async function buildExecutiveCommissionRows(filters) {
  const { project_id, date_from, date_to, agent_id } = filters;
  const bookingQuery = { status: { $in: ['active', 'completed'] } };
  if (project_id) bookingQuery.project = project_id;
  Object.assign(bookingQuery, dateRangeFilter('createdAt', date_from, date_to));

  const bookings = await Booking.find(bookingQuery)
    .populate('customer', 'name')
    .populate('plot', 'plotNumber totalArea plotDimensions')
    .populate('project', 'name')
    .populate('agent', 'name')
    .populate('agentRank');

  const bookingIds = bookings.map((b) => b._id);
  const [paidEmis, pendingEmis, walletTxns, allAgents] = await Promise.all([
    Emi.find({ booking: { $in: bookingIds }, status: 'paid' }),
    Emi.find({ booking: { $in: bookingIds }, status: 'paid', commissionProcessed: false }),
    WalletTransaction.find({ booking: { $in: bookingIds }, category: { $in: ['emi_commission', 'rank_difference'] }, type: 'credit' }),
    User.find({}).select('name'),
  ]);
  const agentNameMap = {};
  allAgents.forEach((a) => (agentNameMap[String(a._id)] = a.name));

  const paidByBooking = {};
  for (const e of paidEmis) {
    const key = String(e.booking);
    if (!paidByBooking[key]) paidByBooking[key] = { received: 0, cash: 0, bank: 0, cheque: 0, modes: new Set() };
    const b = paidByBooking[key];
    b.received += e.amount || 0;
    if (e.paymentMode === 'cash') { b.cash += e.amount || 0; b.modes.add('Cash'); }
    else if (e.paymentMode === 'cheque') { b.cheque += e.amount || 0; b.modes.add('Cheque'); }
    else { b.bank += e.amount || 0; b.modes.add('Bank'); }
  }

  const pendingByBooking = {};
  for (const e of pendingEmis) {
    const key = String(e.booking);
    if (!pendingByBooking[key]) pendingByBooking[key] = [];
    pendingByBooking[key].push(e);
  }

  const walletByBooking = {};
  for (const t of walletTxns) {
    const key = String(t.booking);
    if (!walletByBooking[key]) walletByBooking[key] = {};
    const agentKey = String(t.agent);
    walletByBooking[key][agentKey] = (walletByBooking[key][agentKey] || 0) + (t.amount || 0);
  }

  const rows = [];
  for (const b of bookings) {
    const key = String(b._id);
    if (agent_id && String(b.agent?._id) !== agent_id) continue;
    const paid = paidByBooking[key] || { received: 0, cash: 0, bank: 0, cheque: 0, modes: new Set() };
    const collectionSource = paid.modes.size ? Array.from(paid.modes).join(' + ') : '-';
    const saleValue = b.totalAmount || 0;
    const custOutstanding = Math.max(saleValue - paid.received, 0);
    if (!b.agent) continue;
    const levelMap = await buildLevelMap(b.agent);

    // Paid rows — from real wallet credits, one row per (booking, agent).
    const paidAgents = walletByBooking[key] || {};
    for (const [agentId, amount] of Object.entries(paidAgents)) {
      rows.push({
        plot: b.plot?.plotNumber || 'N/A',
        area: b.plot?.plotDimensions ? `${b.plot.totalArea} (${b.plot.plotDimensions})` : b.plot?.totalArea || 'N/A',
        project: b.project?.name || 'N/A',
        customer: b.customer?.name || 'N/A',
        soldBy: b.agent.name,
        commissionTo: agentNameMap[agentId] || 'Unknown',
        level: levelLabel(levelMap[agentId] || 1),
        collectionSource,
        cash: paid.cash,
        bank: paid.bank,
        cheque: paid.cheque,
        saleValue,
        received: paid.received,
        custOutstanding,
        grossComm: amount,
        paidComm: amount,
        commOutstanding: 0,
        status: 'Paid',
      });
    }

    // Pending rows — EMIs paid by the customer but commission not yet released.
    const pending = pendingByBooking[key] || [];
    const pendingTotals = {};
    for (const e of pending) {
      const computed = await computePendingCommissionRows(e, b);
      for (const r of computed) {
        pendingTotals[r.agentId] = (pendingTotals[r.agentId] || 0) + r.amount;
      }
    }
    for (const [agentId, amount] of Object.entries(pendingTotals)) {
      rows.push({
        plot: b.plot?.plotNumber || 'N/A',
        area: b.plot?.plotDimensions ? `${b.plot.totalArea} (${b.plot.plotDimensions})` : b.plot?.totalArea || 'N/A',
        project: b.project?.name || 'N/A',
        customer: b.customer?.name || 'N/A',
        soldBy: b.agent.name,
        commissionTo: agentNameMap[agentId] || 'Unknown',
        level: levelLabel(levelMap[agentId] || 1),
        collectionSource,
        cash: paid.cash,
        bank: paid.bank,
        cheque: paid.cheque,
        saleValue,
        received: paid.received,
        custOutstanding,
        grossComm: amount,
        paidComm: 0,
        commOutstanding: amount,
        status: 'Pending',
      });
    }
  }

  const summary = {
    total_plots: bookings.length,
    sale_value: bookings.reduce((s, b) => s + (b.totalAmount || 0), 0),
    customer_received: rows.length
      ? Object.values(paidByBooking).reduce((s, p) => s + p.received, 0)
      : 0,
    customer_outstanding: bookings.reduce((s, b) => {
      const p = paidByBooking[String(b._id)] || { received: 0 };
      return s + Math.max((b.totalAmount || 0) - p.received, 0);
    }, 0),
    gross_commission: rows.reduce((s, r) => s + r.grossComm, 0),
    commission_paid: rows.reduce((s, r) => s + r.paidComm, 0),
    commission_outstanding: rows.reduce((s, r) => s + r.commOutstanding, 0),
  };

  return { rows, summary };
}

// GET /api/admin/reports/executive-commissions
async function executiveCommissions(req, res) {
  try {
    const { rows, summary } = await buildExecutiveCommissionRows(req.query);
    return res.json({ data: rows, summary });
  } catch (err) {
    console.error('Executive commission report error:', err);
    return res.status(500).json({ message: 'Failed to fetch executive commission report.', error: err.message });
  }
}

// GET /api/admin/reports/executive-commissions/export
async function executiveCommissionsExport(req, res) {
  try {
    const { rows } = await buildExecutiveCommissionRows(req.query);
    const headers = ['Plot', 'Area', 'Project', 'Customer', 'Sold By', 'Commission To', 'Level', 'Collection Source', 'Cash', 'Bank', 'Cheque', 'Sale Value', 'Received', 'Cust Outstanding', 'Gross Comm', 'Paid Comm', 'Comm Outstanding', 'Status'];
    const csvRows = rows.map((r) => [
      r.plot, r.area, r.project, r.customer, r.soldBy, r.commissionTo, r.level, r.collectionSource,
      r.cash, r.bank, r.cheque, r.saleValue, r.received, r.custOutstanding, r.grossComm, r.paidComm, r.commOutstanding, r.status,
    ]);
    return sendCsv(res, `executive_commission_report_${timestamp()}.csv`, toCsv(headers, csvRows));
  } catch (err) {
    return res.status(500).json({ message: 'Failed to export executive commission report.', error: err.message });
  }
}

async function buildCommissionsQuery(filters) {
  const { date_from, date_to, agent_id, category, points_type, booking_id, project_id, payment_type, search } = filters;

  const query = { type: 'credit', ...dateRangeFilter('createdAt', date_from, date_to) };
  if (agent_id) query.agent = agent_id;
  if (category && category !== 'all') query.category = category;
  if (points_type && points_type !== 'all') query.pointsType = points_type;
  if (booking_id) query.booking = booking_id;

  // Down Payment / Booking Token / Registry commission all share the same
  // categories as regular EMI commission (see processCombinedDepositCommission
  // and processEmiCommission) — the only way to tell them apart is which Emi
  // line (by emiNumber) each WalletTransaction is linked to.
  if (payment_type && payment_type !== 'all') {
    const emiNumberFilter =
      payment_type === 'token'
        ? { $eq: 0 }
        : payment_type === 'down_payment'
        ? { $lt: 0 }
        : payment_type === 'registry'
        ? { $eq: 99 }
        : { $gt: 0, $lt: 99 }; // 'emi'
    const matchingEmiIds = await Emi.find({ emiNumber: emiNumberFilter }).distinct('_id');
    query.emi = { $in: matchingEmiIds };
  }

  if (project_id) {
    const projectBookingIds = await Booking.find({ project: project_id }).distinct('_id');
    if (query.booking) {
      // booking_id filter already narrowed it to one booking — only keep it
      // if that booking actually belongs to the selected project.
      const already = String(query.booking);
      query.booking = projectBookingIds.some((id) => String(id) === already)
        ? query.booking
        : { $in: [] };
    } else {
      query.booking = { $in: projectBookingIds };
    }
  }

  if (search && search.trim()) {
    const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const [matchingAgents, matchingBookings] = await Promise.all([
      User.find({ name: re }).distinct('_id'),
      Booking.find({ bookingNumber: re }).distinct('_id'),
    ]);
    const searchBookingIds = new Set([...matchingBookings.map(String)]);
    if (query.booking && query.booking.$in) {
      const allowed = new Set(query.booking.$in.map(String));
      query.$or = [
        { agent: { $in: matchingAgents } },
        { booking: { $in: [...searchBookingIds].filter((id) => allowed.has(id)) } },
      ];
    } else {
      query.$or = [{ agent: { $in: matchingAgents } }, { booking: { $in: matchingBookings } }];
    }
  }

  return query;
}

// GET /api/admin/reports/commissions
async function commissions(req, res) {
  try {
    const query = await buildCommissionsQuery(req.query);

   const [totalBv, totalPv, emiCommissions, rankDifference, uniqueAgents, allEmiCommissionTxns] = await Promise.all([
      sumAmount(WalletTransaction, { ...query, pointsType: 'BV' }),
      sumAmount(WalletTransaction, { ...query, pointsType: 'PV' }),
      sumAmount(WalletTransaction, { ...query, category: 'emi_commission' }),
      sumAmount(WalletTransaction, { ...query, category: 'rank_difference' }),
      WalletTransaction.distinct('agent', query),
      WalletTransaction.find({ ...query, category: 'emi_commission' })
        .select('category booking emi sqftPortion pointsType createdAt')
        .populate('emi'),
    ]);

    const allCompanyRows = await buildCompanyRows(allEmiCommissionTxns);
    const totalCompanyCommission = allCompanyRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      WalletTransaction.find(query)
        .populate({ path: 'agent', select: 'name referralCode', populate: { path: 'rank' } })
        .populate({ path: 'booking', populate: [{ path: 'plot' }, { path: 'project', select: 'name' }] })
        .populate('emi')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      WalletTransaction.countDocuments(query),
    ]);

    const companyRows = await buildCompanyRows(transactions);
    const mergedData = [...transactions, ...companyRows].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const headers = ['Date', 'Agent', 'Rank', 'Category', 'Booking#', 'Plot', 'EMI Month', 'BV Amount', 'PV Amount', 'Remark'];

    return res.json({
      data: mergedData,
      meta: { page, limit, total, lastPage: Math.ceil(total / limit) },
      summary: {
        total_bv: totalBv,
        total_pv: totalPv,
        emi_commissions: emiCommissions,
        rank_difference: rankDifference,
        agents_earning: uniqueAgents.length,
        total_company_commission: totalCompanyCommission,
      },
    });
    } catch (err) {
    console.error('Commission report error:', err);
    return res.status(500).json({ message: 'Failed to fetch commission report.', error: err.message });

  }
}

// GET /api/admin/reports/commissions/export
async function commissionsExport(req, res) {
  try {
    const query = await buildCommissionsQuery(req.query);

    const transactions = await WalletTransaction.find(query)
      .populate({ path: 'agent', select: 'name referralCode', populate: { path: 'rank' } })
      .populate({ path: 'booking', populate: [{ path: 'plot' }, { path: 'project', select: 'name' }] })
      .populate('emi')
      .sort({ createdAt: -1 });

    const companyRows = await buildCompanyRows(transactions);
    const mergedData = [...transactions, ...companyRows].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const headers = ['Executive', 'Project / Plot', 'Plot Area', 'Rate Value', 'Rate Type', 'Formatted Rate', 'Amount (INR)', 'Status', 'Date'];
    const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

    const rows = mergedData.map((t) => {
      const executive = t.isCompany
        ? (t.agent?.name || 'Company')
        : `${t.agent?.name || 'N/A'}${t.agent?.referralCode ? `(${t.agent.referralCode})` : ''}`;
      const projectName = t.booking?.project?.name || 'N/A';
      const plotNumber = t.booking?.plot?.plotNumber || 'N/A';
      const plotArea = t.booking?.totalArea ? `${t.booking.totalArea} sq.ft` : 'N/A';
      const sqft = t.sqftPortion != null ? Number(t.sqftPortion) : Number(t.emi?.sqftPortion) || 0;
      const rateValue = sqft > 0 ? Math.round((t.amount / sqft) * 100) / 100 : 0;
      const formattedRate = `\u20B9${fmtNum(rateValue)}/sq.ft`;
      const emiStatus = t.emi?.status || 'pending';
      const status = emiStatus === 'paid' ? 'CREDITED' : emiStatus.toUpperCase();
      const date = new Date(t.createdAt).toLocaleDateString('en-IN');

      return [
        executive,
        `${projectName}\nPlot ${plotNumber}`,
        plotArea,
        rateValue,
        'Per Sq.Ft',
        formattedRate,
        fmtNum(t.amount),
        status,
        date,
      ];
    });

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
        e.emiNumber === 0 ? 'booking' : e.emiNumber < 0 ? `down payment ${Math.abs(e.emiNumber)}` : e.emiNumber === 99 ? 'registry' : 'installment',
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
  bookedPlots,
  bookedPlotsExport,
  executiveCommissions,
  executiveCommissionsExport,
};