const Emi = require('../../models/Emi');
const Booking = require('../../models/Booking');
const Plot = require('../../models/Plot');
const commissionService = require('../../services/commissionService');
const auditService = require('../../services/auditService');

// GET /api/admin/emis
async function index(req, res) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const dateFrom = req.query.date_from ? new Date(req.query.date_from) : startOfMonth;
  const dateTo = req.query.date_to ? new Date(req.query.date_to) : endOfMonth;

  const filter = { dueDate: { $gte: dateFrom, $lte: dateTo } };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.booking_id) filter.booking = req.query.booking_id;
  if (req.query.agent_id) filter.agent = req.query.agent_id;

  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const [emis, total] = await Promise.all([
    Emi.find(filter)
      .populate({ path: 'booking', populate: [{ path: 'customer' }, { path: 'plot' }, { path: 'project' }] })
      .populate('agent')
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(limit),
    Emi.countDocuments(filter),
  ]);

  res.json({ data: emis, meta: { page, limit, total, lastPage: Math.ceil(total / limit) }, dateFrom, dateTo });
}

// GET /api/admin/bookings/:id/emis
async function bookingEmis(req, res) {
  const emis = await Emi.find({ booking: req.params.id }).sort({ emiNumber: 1 });
  res.json(emis);
}

// POST /api/admin/emis/:id/mark-paid
async function markPaid(req, res) {
  const { paid_date, payment_mode, payment_reference } = req.body;

  const errors = {};
  if (!paid_date) errors.paid_date = 'Paid date is required.';
  if (!payment_mode || !['cash', 'online'].includes(payment_mode)) errors.payment_mode = 'Invalid payment mode.';
  if (Object.keys(errors).length) return res.status(422).json({ success: false, errors });

  const emi = await Emi.findById(req.params.id);
  if (!emi) return res.status(404).json({ success: false, message: 'EMI not found.' });

  if (emi.status === 'paid' || emi.status === 'cancelled') {
    return res.status(422).json({ success: false, message: 'EMI already paid or cancelled' });
  }

  if (emi.commissionProcessed) {
    return res.status(422).json({ success: false, message: 'Commission for this EMI has already been processed' });
  }

  try {
    emi.status = 'paid';
    emi.paidDate = paid_date;
    emi.paymentMode = payment_mode;
    emi.paymentReference = payment_reference || null;
    await emi.save();

    await commissionService.processEmiCommission(emi);

    // Check if all EMIs for this booking are paid
    const booking = await Booking.findById(emi.booking);
    const unpaidCount = await Emi.countDocuments({ booking: booking._id, status: { $ne: 'paid' } });

    if (unpaidCount === 0) {
      booking.status = 'completed';
      await booking.save();
      await Plot.findByIdAndUpdate(booking.plot, { status: 'sold' });
    }

    await auditService.log(
      req,
      'emi.paid',
      `EMI #${emi._id} for booking ${booking.bookingNumber} marked as paid by ${req.user.name}`,
      emi
    );

    return res.json({ success: true, message: 'EMI marked as paid and commission processed' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/admin/emis/overdue
async function overdue(req, res) {
  await Emi.updateMany({ status: 'pending', dueDate: { $lt: new Date() } }, { status: 'overdue' });

  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const filter = { status: 'overdue' };
  const [emis, total] = await Promise.all([
    Emi.find(filter)
      .populate({ path: 'booking', populate: [{ path: 'customer' }, { path: 'plot' }, { path: 'project' }] })
      .populate('agent')
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(limit),
    Emi.countDocuments(filter),
  ]);

  res.json({ data: emis, meta: { page, limit, total, lastPage: Math.ceil(total / limit) } });
}

module.exports = { index, bookingEmis, markPaid, overdue };