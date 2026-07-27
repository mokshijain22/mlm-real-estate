const Booking = require('../../models/Booking');
const Customer = require('../../models/Customer');
const Plot = require('../../models/Plot');
const bookingService = require('../../services/bookingService');
const auditService = require('../../services/auditService');

// GET /api/agent/bookings
async function index(req, res) {
  const bookings = await Booking.find({ agent: req.user._id })
    .populate('customer')
    .populate('plot')
    .populate('project')
    .sort({ createdAt: -1 });

  return res.json({ bookings });
}

// GET /api/agent/bookings/create-data  (data needed to render the create form)
async function createData(req, res) {
  const selectedCustomerId = req.query.customer_id || null;

  const [customers, plots] = await Promise.all([
    Customer.find({ addedBy: req.user._id }).sort({ name: 1 }),
    Plot.find({ status: 'available' }).populate('project'),
  ]);

  return res.json({ customers, plots, selectedCustomerId });
}

// POST /api/agent/bookings
async function store(req, res) {
  const { customer_id, plot_id, booking_amount, emi_months, payment_mode, price_per_sqft, notes } = req.body;

  const errors = {};
  if (!customer_id) errors.customer_id = 'Customer is required.';
  if (!plot_id) errors.plot_id = 'Plot is required.';
  if (price_per_sqft === undefined || Number(price_per_sqft) < 0) errors.price_per_sqft = 'Valid price per sqft is required.';
  if (booking_amount === undefined || Number(booking_amount) < 0) errors.booking_amount = 'Valid booking amount is required.';
  if (!emi_months || emi_months < 1 || emi_months > 360) errors.emi_months = 'EMI months must be between 1 and 360.';
  if (!payment_mode || !['cash', 'online'].includes(payment_mode)) errors.payment_mode = 'Invalid payment mode.';
  if (Object.keys(errors).length) return res.status(422).json({ errors });

  // Verify customer ownership (mirrors Laravel's added_by check + firstOrFail)
  const customer = await Customer.findOne({ _id: customer_id, addedBy: req.user._id });
  if (!customer) return res.status(404).json({ message: 'Customer not found.' });

  // Verify plot availability
  const plot = await Plot.findOne({ _id: plot_id, status: 'available' });
  if (!plot) return res.status(422).json({ errors: { plot_id: 'Plot is not available for booking' } });

  const data = { customer_id, plot_id, booking_amount, emi_months, payment_mode, price_per_sqft, notes, agent_id: req.user._id };

  try {
    const booking = await bookingService.createBooking(data, req.user);
    await booking.populate('customer');

    await auditService.log(
      req,
      'booking.created',
      `Booking ${booking.bookingNumber} created for customer ${booking.customer.name} by ${req.user.name}`,
      booking
    );

    return res.status(201).json({ message: 'Booking submitted successfully! Waiting for admin approval.', data: booking });
  } catch (err) {
    return res.status(422).json({ message: 'Booking failed: ' + err.message });
  }
}

// GET /api/agent/bookings/:id
async function show(req, res) {
  const booking = await Booking.findOne({ _id: req.params.id, agent: req.user._id })
    .populate('customer')
    .populate('plot')
    .populate('project');

  if (!booking) return res.status(404).json({ message: 'Booking not found.' });

  const Emi = require('../../models/Emi');
  const emis = await Emi.find({ booking: booking._id }).sort({ emiNumber: 1 });

  return res.json({ booking, emis });
}

module.exports = { index, createData, store, show };