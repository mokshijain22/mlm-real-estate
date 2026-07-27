const Booking = require('../../models/Booking');
const Customer = require('../../models/Customer');
const Plot = require('../../models/Plot');
const Project = require('../../models/Project');
const User = require('../../models/User');
const Role = require('../../models/Role');

const bookingService = require('../../services/bookingService');
const commissionService = require('../../services/commissionService');
const { checkAndUpgradeRank } = require('../../services/rankService');
const auditService = require('../../services/auditService');

async function index(req, res) {
  const filter = {};
  const { status, approval_status, project_id, agent_id, date_from, date_to } = req.query;

  if (status) filter.status = status;
  if (approval_status) filter.approvalStatus = approval_status;
  if (project_id) filter.project = project_id;
  if (agent_id) filter.agent = agent_id;
  if (date_from || date_to) {
    filter.bookingDate = {};
    if (date_from) filter.bookingDate.$gte = new Date(date_from);
    if (date_to) filter.bookingDate.$lte = new Date(date_to);
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

async function create(req, res) {
  const agentRole = await Role.findOne({ slug: 'agent' });

  const [customers, projects, agents] = await Promise.all([
    Customer.find({ status: 'active' }),
    Project.find(),
    agentRole ? User.find({ role: agentRole._id }) : [],
  ]);

  res.json({ customers, projects, agents });
}

async function store(req, res) {
  const { customer_id, plot_id, agent_id, price_per_sqft, booking_amount, emi_months, payment_mode, notes } = req.body;

  const errors = {};
  if (!customer_id) errors.customer_id = 'Customer is required.';
  if (!plot_id) errors.plot_id = 'Plot is required.';
  if (!agent_id) errors.agent_id = 'Agent is required.';
  if (price_per_sqft === undefined || Number(price_per_sqft) < 0) errors.price_per_sqft = 'Valid price per sqft is required.';
  if (booking_amount === undefined || Number(booking_amount) < 0) errors.booking_amount = 'Valid booking amount is required.';
  if (!emi_months || emi_months < 1 || emi_months > 360) errors.emi_months = 'EMI months must be between 1 and 360.';
  if (!payment_mode || !['cash', 'online'].includes(payment_mode)) errors.payment_mode = 'Invalid payment mode.';
  if (Object.keys(errors).length) return res.status(422).json({ errors });

  const plot = await Plot.findById(plot_id);
  if (!plot) return res.status(404).json({ message: 'Plot not found.' });
  if (plot.status !== 'available') {
    return res.status(422).json({ errors: { plot_id: 'Plot is not available for booking' } });
  }

  try {
    const booking = await bookingService.createBooking(req.body, req.user);
    await booking.populate('customer');

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

  res.json({ booking, emis, commissionPreview });
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

module.exports = { index, pending, create, store, show, cancel, approve, reject };