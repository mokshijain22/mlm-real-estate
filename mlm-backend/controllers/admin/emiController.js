const Emi = require('../../models/Emi');
const Booking = require('../../models/Booking');
const Plot = require('../../models/Plot');
const commissionService = require('../../services/commissionService');
const auditService = require('../../services/auditService');

/**
 * Release commission triggered by the Down Payment being paid. If this
 * booking also has a "Booking Deposit" milestone (emiNumber = 0) whose
 * commission hasn't gone out yet, both are combined and released together
 * in one payout. Otherwise the Down Payment's own commission is released
 * on its own. Mirrors Laravel EmiController::releaseDownPaymentCommission.
 */
async function releaseDownPaymentCommission(downPaymentEmi) {
  const depositEmi = await Emi.findOne({ booking: downPaymentEmi.booking, emiNumber: 0 });

  if (depositEmi && !depositEmi.commissionProcessed) {
    if (depositEmi.status !== 'paid') {
      depositEmi.status = 'paid';
      depositEmi.paidDate = downPaymentEmi.paidDate;
      depositEmi.paymentMode = downPaymentEmi.paymentMode;
      await depositEmi.save();
    }
    await commissionService.processCombinedDepositCommission(downPaymentEmi, depositEmi);
  } else {
    await commissionService.processEmiCommission(downPaymentEmi);
  }
}

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
  const { paid_date, payment_mode, payment_reference, release_late_commission } = req.body;

  const errors = {};
  if (!paid_date) errors.paid_date = 'Paid date is required.';
  if (!payment_mode || !['cash', 'online'].includes(payment_mode)) errors.payment_mode = 'Invalid payment mode.';
  if (Object.keys(errors).length) return res.status(422).json({ success: false, errors });

  const emi = await Emi.findById(req.params.id);
  if (!emi) return res.status(404).json({ success: false, message: 'EMI not found.' });

  if (emi.status === 'cancelled') {
    return res.status(422).json({ success: false, message: 'EMI already cancelled' });
  }

  // Already paid, but commission is still being held — Admin explicitly
  // releasing it now (e.g. via the "Release Commission" button).
  if (emi.status === 'paid' && !emi.commissionProcessed) {
    if (emi.emiNumber === -1 && release_late_commission) {
      try {
        await releaseDownPaymentCommission(emi);

        await auditService.log(
          req,
          'emi.late_commission_released',
          `Admin ${req.user.name} manually released the Deposit + Down Payment commission for booking ${emi.booking}`,
          emi
        );

        return res.json({ success: true, message: 'Commission released' });
      } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
    }
    return res.status(422).json({ success: false, message: 'EMI already paid; commission is pending Admin release' });
  }

  if (emi.status === 'paid') {
    return res.status(422).json({ success: false, message: 'EMI already paid or cancelled' });
  }

  if (emi.commissionProcessed) {
    return res.status(422).json({ success: false, message: 'Commission for this EMI has already been processed' });
  }

  // The "Down Payment" milestone only releases commission automatically if
  // it's marked paid within 30 days of the booking's due date. If late, Admin
  // must explicitly send release_late_commission — otherwise the payment is
  // recorded but no commission goes out yet (per the 30-day rule).
  const isLateDownPayment = emi.emiNumber === -1 && new Date(paid_date) > new Date(emi.dueDate);
  const skipCommission = isLateDownPayment && !release_late_commission;

  try {
    emi.status = 'paid';
    emi.paidDate = paid_date;
    emi.paymentMode = payment_mode;
    emi.paymentReference = payment_reference || null;
    await emi.save();

    if (emi.emiNumber === 0) {
      // "Booking Deposit" — its commission is held and released ONLY together
      // with the Down Payment (see below), UNLESS this booking has no Down
      // Payment component at all, in which case there's nothing to wait for.
      const hasDownPayment = await Emi.exists({ booking: emi.booking, emiNumber: -1 });
      if (!hasDownPayment) {
        await commissionService.processEmiCommission(emi);
      }
    } else if (emi.emiNumber === -1) {
      // "Down Payment" — this is what TRIGGERS the combined release
      // (Deposit + Down Payment together), subject to the 30-day rule.
      if (!skipCommission) {
        await releaseDownPaymentCommission(emi);
      }
    } else {
      // Regular monthly EMI — unchanged, normal behavior.
      await commissionService.processEmiCommission(emi);
    }

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
      `EMI #${emi._id} for booking ${booking.bookingNumber} marked as paid by ${req.user.name}` +
        (skipCommission ? ' (down payment received after 30 days — commission withheld pending Admin release)' : ''),
      emi
    );

    const message = skipCommission
      ? 'Down payment recorded, but it arrived after the 30-day window — commission (Deposit + Down Payment) withheld. Admin can release it later from this same screen.'
      : 'Payment recorded and commission processed';

    return res.json({ success: true, message });
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