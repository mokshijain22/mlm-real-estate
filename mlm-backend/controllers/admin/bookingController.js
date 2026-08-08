const Booking = require('../../models/Booking');
const Customer = require('../../models/Customer');
const Plot = require('../../models/Plot');
const Project = require('../../models/Project');
const User = require('../../models/User');
const Role = require('../../models/Role');
const { PAYMENT_MODES } = require('../../utils/paymentModes');

const bookingService = require('../../services/bookingService');
const commissionService = require('../../services/commissionService');
const { checkAndUpgradeRank } = require('../../services/rankService');
const auditService = require('../../services/auditService');

async function index(req, res) {
  const filter = {};
  const { status, approval_status, project_id, agent_id, date_from, date_to, search } = req.query;

  if (status) filter.status = status;
  if (approval_status) filter.approvalStatus = approval_status;
  if (project_id) filter.project = project_id;
  if (agent_id) filter.agent = agent_id;
  if (date_from || date_to) {
    filter.bookingDate = {};
    if (date_from) filter.bookingDate.$gte = new Date(date_from);
    if (date_to) filter.bookingDate.$lte = new Date(date_to);
  }
  if (search && search.trim()) {
    const re = new RegExp(search.trim(), 'i');
    const [matchedCustomers, matchedAgents] = await Promise.all([
      Customer.find({ name: re }).select('_id'),
      User.find({ name: re }).select('_id'),
    ]);
    filter.$or = [
      { bookingNumber: re },
      { customer: { $in: matchedCustomers.map((c) => c._id) } },
      { agent: { $in: matchedAgents.map((a) => a._id) } },
    ];
  }

  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const [bookings, total, projects, agentRole, pendingCount] = await Promise.all([
    Booking.find(filter)
      .populate('customer')
      .populate('plot')
      .populate('project')
      .populate('agent')
      .populate('agentRank')
      .sort({ bookingDate: -1 })
      .skip(skip)
      .limit(limit),
    Booking.countDocuments(filter),
    Project.find(),
    Role.findOne({ slug: 'agent' }),
    Booking.countDocuments({ approvalStatus: 'pending' }),
  ]);

  const agents = agentRole ? await User.find({ role: agentRole._id }) : [];

  res.json({
    data: bookings,
    meta: { page, limit, total, lastPage: Math.ceil(total / limit) },
    projects,
    agents,
    pendingCount,
  });
}

async function pending(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const filter = { approvalStatus: 'pending' };
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('customer')
      .populate('plot')
      .populate('project')
      .populate('agent')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Booking.countDocuments(filter),
  ]);

  res.json({ data: bookings, meta: { page, limit, total, lastPage: Math.ceil(total / limit) } });
}

// POST /api/admin/bookings/upload-document
// Uploads a single booking document before the booking exists; the wizard
// stores the returned relative path and sends it along with the final
// create-booking payload.
async function uploadDocument(req, res) {
  if (!req.file) return res.status(422).json({ message: 'No file uploaded.' });
  const relativePath = `/storage/booking-docs/${req.file.filename}`;
  res.json({ message: 'File uploaded.', path: relativePath });
}

async function create(req, res) {
  const agentRole = await Role.findOne({ slug: 'agent' });

  const [customers, projects, agents] = await Promise.all([
    Customer.find({ status: 'active' }),
    Project.find(),
    agentRole ? User.find({ role: agentRole._id }) : [],
  ]);

  res.json({ customers, projects, agents });
}

// POST /api/admin/bookings/commission-preview
// Used by the Create Booking wizard's Commission step, before the booking is saved.
async function commissionPreview(req, res) {
  const { agent_id, project_id, price_per_sqft, emi_amount, emi_months, payment_mode, commission_ratio } = req.body;

  if (!agent_id || !emi_months || !payment_mode) {
    return res.status(422).json({ message: 'agent_id, emi_months and payment_mode are required.' });
  }

  try {
    let commissionPool = 0;
    if (project_id) {
      const project = await Project.findById(project_id).select('commissionPool');
      commissionPool = project?.commissionPool || 0;
    }

    // Same PLC exclusion as generateEmis() — the wizard sends the raw EMI ₹
    // (which includes any PLC premium baked into the selling price), so we
    // scale it down here too, otherwise the preview would show commission
    // on the PLC portion that the real saved booking then wouldn't have.
    const ratio = commission_ratio !== undefined ? Math.min(Math.max(Number(commission_ratio) || 1, 0), 1) : 1;

    const preview = await commissionService.previewCommissionForData({
      agentId: agent_id,
      pricePerSqft: Number(price_per_sqft) || 0,
      emiAmount: (Number(emi_amount) || 0) * ratio,
      emiMonths: Number(emi_months),
      paymentMode: payment_mode,
      commissionPool,
    });
    res.json({ preview, commission_pool_per_sqft: commissionPool });
  } catch (err) {
    res.status(422).json({ message: err.message });
  }
}

async function store(req, res) {
  const { customer_id, plot_id, agent_id, price_per_sqft, booking_amount, emi_months, payment_mode, notes } = req.body;

  const errors = {};
  if (!customer_id) errors.customer_id = 'Customer is required.';
  if (!plot_id) errors.plot_id = 'Plot is required.';
  if (price_per_sqft === undefined || Number(price_per_sqft) < 0) errors.price_per_sqft = 'Valid price per sqft is required.';
  if (booking_amount === undefined || Number(booking_amount) < 0) errors.booking_amount = 'Valid booking amount is required.';
  if (!emi_months || emi_months < 1 || emi_months > 360) errors.emi_months = 'EMI months must be between 1 and 360.';
  if (!payment_mode || !PAYMENT_MODES.includes(payment_mode)) errors.payment_mode = 'Invalid payment mode.';  if (Object.keys(errors).length) return res.status(422).json({ errors });

  const plot = await Plot.findById(plot_id);
  if (!plot) return res.status(404).json({ message: 'Plot not found.' });
  if (plot.status !== 'available') {
    return res.status(422).json({ errors: { plot_id: 'Plot is not available for booking' } });
  }

  try {
    const booking = await bookingService.createBooking(req.body, req.user);
    await booking.populate('customer');

    if (req.body.lead_id) {
      try {
        const Lead = require('../../models/Lead');
        await Lead.findByIdAndUpdate(req.body.lead_id, {
          status: 'converted',
          convertedBooking: booking._id,
        });
      } catch (leadErr) {
        console.error('Failed to mark lead as converted:', leadErr.message);
      }
    }

    await auditService.log(
      req,
      'booking.created',
      `Booking ${booking.bookingNumber} created for customer ${booking.customer.name} by ${req.user.name}`,
      booking
    );

    return res.status(201).json({ message: 'Booking created successfully', data: booking });
  } catch (err) {
    return res.status(422).json({ message: err.message });
  }
}

async function show(req, res) {
  const booking = await Booking.findById(req.params.id)
    .populate('customer')
    .populate('plot')
    .populate('project')
    .populate('agent')
    .populate('agentRank')
    .populate('createdBy');

  if (!booking) return res.status(404).json({ message: 'Booking not found.' });

  const Emi = require('../../models/Emi');
  const emis = await Emi.find({ booking: booking._id }).sort({ emiNumber: 1 });

  const commissionPreview = await commissionService.previewCommission(booking);

  if (booking.agent) {
    await booking.agent.populate('rank');
  }

  // How many EMI/payment lines are actually paid vs pending on this booking,
  // and how much commission has actually been credited to each agent's
  // wallet so far (not projected) — so the preview table can distinguish
  // "full projected total" from "what's actually been earned so far".
  // "EMIs Paid" column should count only the real monthly EMI installments —
  // not the Down Payment (-1), Booking Token (0), or Registry (99) lines,
  // which are separate one-time milestones, not EMIs.
  const realEmis = emis.filter((e) => e.emiNumber >= 1 && e.emiNumber < 99);
  const paidEmisCount = realEmis.filter((e) => e.status === 'paid').length;
  const totalEmisCount = realEmis.length;

  const WalletTransaction = require('../../models/WalletTransaction');
  const actualCreditedAgg = await WalletTransaction.aggregate([
    {
      $match: {
        booking: booking._id,
        type: 'credit',
        category: { $in: ['emi_commission', 'deposit_commission', 'rank_difference'] },
      },
    },
    { $group: { _id: '$agent', total: { $sum: '$amount' } } },
  ]);
  const actualCreditedByAgent = {};
  for (const row of actualCreditedAgg) {
    actualCreditedByAgent[String(row._id)] = row.total;
  }

  res.json({
    booking,
    emis,
    commissionPreview,
    commissionProgress: {
      paidEmisCount,
      totalEmisCount,
      actualCreditedByAgent,
    },
  });
}

async function cancel(req, res) {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found.' });

  if (booking.status !== 'active') {
    return res.status(422).json({ message: 'Only active bookings can be cancelled' });
  }

  try {
    await bookingService.cancelBooking(booking);

    await auditService.log(req, 'booking.cancelled', `Booking ${booking.bookingNumber} cancelled by ${req.user.name}`, booking);

    return res.json({ message: 'Booking cancelled successfully' });
  } catch (err) {
    return res.status(422).json({ message: err.message });
  }
}

async function approve(req, res) {
  const { approval_reason } = req.body;
  const booking = await Booking.findById(req.params.id).populate('plot').populate('agent');
  if (!booking) return res.status(404).json({ message: 'Booking not found.' });

  if (booking.approvalStatus !== 'pending') {
    return res.status(422).json({ message: 'Booking is not in pending status.' });
  }

  booking.approvalStatus = 'approved';
  booking.status = 'active';
  booking.approvedBy = req.user._id;
  booking.approvedAt = new Date();
  booking.approvalReason = approval_reason || null;
  await booking.save();

  await Plot.findByIdAndUpdate(booking.plot._id, { status: 'sold' });

  await bookingService.generateEmis(booking);

  await checkAndUpgradeRank(booking.agent);

  await auditService.log(req, 'booking.approved', `Booking ${booking.bookingNumber} approved by ${req.user.name}`, booking);

  return res.json({ message: 'Booking approved successfully. Plot is now active.', data: booking });
}

async function reject(req, res) {
  const { rejection_reason } = req.body;
  if (!rejection_reason || rejection_reason.length < 3) {
    return res.status(422).json({ errors: { rejection_reason: 'Rejection reason must be at least 3 characters.' } });
  }

  const booking = await Booking.findById(req.params.id).populate('plot').populate('agent');
  if (!booking) return res.status(404).json({ message: 'Booking not found.' });

  if (booking.approvalStatus !== 'pending') {
    return res.status(422).json({ message: 'Booking is not in pending status.' });
  }

  booking.approvalStatus = 'rejected';
  booking.status = 'cancelled';
  booking.rejectionReason = rejection_reason;
  booking.approvedBy = req.user._id;
  booking.approvedAt = new Date();
  await booking.save();

  await Plot.findByIdAndUpdate(booking.plot._id, { status: 'available' });

  await checkAndUpgradeRank(booking.agent);

  await auditService.log(
    req,
    'booking.rejected',
    `Booking ${booking.bookingNumber} rejected by ${req.user.name}. Reason: ${rejection_reason}`,
    booking
  );

  return res.json({ message: 'Booking rejected and plot released.', data: booking });
}

module.exports = { index, pending, create, store, show, cancel, approve, reject, commissionPreview, uploadDocument };