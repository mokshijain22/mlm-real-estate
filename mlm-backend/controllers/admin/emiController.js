const Emi = require('../../models/Emi');
const Booking = require('../../models/Booking');
const Plot = require('../../models/Plot');
const commissionService = require('../../services/commissionService');
const auditService = require('../../services/auditService');
const { PAYMENT_MODES } = require('../../utils/paymentModes');

// Retries a flaky operation (e.g. a transient DB blip talking to Atlas) a
// few times with a short backoff before giving up. This is what was
// missing when a booking's Token+DP commission silently never got credited
// — the payment itself saved fine, but the one-shot commission call failed
// once and nothing ever tried again.
async function withRetry(fn, attempts = 3, delayMs = 700) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}

// Booking.remainingAmount and Booking.downPaymentAmount are snapshot fields
// set once at creation. Any edit/add to actual Emi documents (DP or regular
// EMI) must call this afterward, or the booking-level summary cards go
// stale while the EMI table itself (which reads live Emi documents) stays
// correct — that mismatch is exactly what caused "Remaining Balance" and
// "Booking Deposit" at the top of the booking detail page to show old
// numbers after a DP installment was added or edited.
async function syncBookingTotals(bookingId) {
  const activeEmis = await Emi.find({ booking: bookingId, status: { $ne: 'cancelled' } });
  const downPaymentAmount = activeEmis
    .filter((e) => e.emiNumber < 0)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const remainingAmount = activeEmis
    .filter((e) => e.emiNumber > 0)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  await Booking.findByIdAndUpdate(bookingId, { downPaymentAmount, remainingAmount });
}

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
  const filter = {};
  if (req.query.date_from || req.query.date_to) {
    filter.dueDate = {};
    if (req.query.date_from) filter.dueDate.$gte = new Date(req.query.date_from);
    if (req.query.date_to) filter.dueDate.$lte = new Date(req.query.date_to);
  }
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

  res.json({ data: emis, meta: { page, limit, total, lastPage: Math.ceil(total / limit) } });
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
  if (!payment_mode || !PAYMENT_MODES.includes(payment_mode)) errors.payment_mode = 'Invalid payment mode.';  if (Object.keys(errors).length) return res.status(422).json({ success: false, errors });

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

  // The payment itself (status/paidDate/paymentMode) is the source of truth
  // that money was actually received — save it FIRST and unconditionally.
  // Commission crediting is a separate concern attempted afterward; if it
  // fails even after retries, the payment stays recorded (as it should —
  // the money really was collected) and we surface that clearly instead of
  // returning a scary 500 that makes the admin think the payment itself
  // failed, when actually it saved fine and only commission is pending.
  try {
    emi.status = 'paid';
    emi.paidDate = paid_date;
    emi.paymentMode = payment_mode;
    emi.paymentReference = payment_reference || null;
    await emi.save();
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }

  let commissionError = null;
  if (!skipCommission) {
    try {
      if (emi.emiNumber === 0) {
        // "Booking Deposit" — its commission is held and released ONLY
        // together with the Down Payment, UNLESS this booking has no Down
        // Payment component at all, in which case there's nothing to wait for.
        const hasDownPayment = await Emi.exists({ booking: emi.booking, emiNumber: -1 });
        if (!hasDownPayment) {
          await withRetry(() => commissionService.processEmiCommission(emi));
        }
      } else if (emi.emiNumber === -1) {
        // "Down Payment" — this TRIGGERS the combined release
        // (Deposit + Down Payment together).
        await withRetry(() => releaseDownPaymentCommission(emi));
      } else {
        // Regular monthly EMI — unchanged, normal behavior.
        await withRetry(() => commissionService.processEmiCommission(emi));
      }
    } catch (err) {
      // Every retry failed. Don't fail the request — the payment already
      // saved successfully. Log it clearly so it's findable via the
      // Commission Pending report instead of silently vanishing.
      commissionError = err.message;
      console.error(`Commission crediting failed for EMI ${emi._id} after retries:`, err);
    }
  }

  try {
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
        (skipCommission ? ' (down payment received after 30 days — commission withheld pending Admin release)' : '') +
        (commissionError ? ` (commission crediting FAILED after retries: ${commissionError} — visible in Commission Pending report)` : ''),
      emi
    );

    let message = 'Payment recorded and commission processed';
    if (skipCommission) {
      message = 'Down payment recorded, but it arrived after the 30-day window — commission (Deposit + Down Payment) withheld. Admin can release it later from this same screen.';
    } else if (commissionError) {
      message = 'Payment recorded successfully, but commission crediting failed after retrying. It has been flagged on the Commission Pending report for retry.';
    }

    return res.json({ success: true, message, commission_failed: !!commissionError });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/admin/emis/commission-pending
// Every paid EMI/DP/Token where commission crediting never succeeded —
// the exact state we found by hand in the DB for Arvind's booking.
async function commissionPending(req, res) {
  const emis = await Emi.find({ status: 'paid', commissionProcessed: false })
    .populate({ path: 'booking', populate: [{ path: 'customer', select: 'name' }, { path: 'agent', select: 'name' }, { path: 'project', select: 'name' }, { path: 'plot', select: 'plotNumber' }] })
    .sort({ paidDate: -1 });

  res.json({ data: emis, count: emis.length });
}

// POST /api/admin/emis/:id/retry-commission
// Re-attempts crediting for one stuck record — the same recovery we did
// manually via a one-off script, now available as a real admin action.
async function retryCommission(req, res) {
  const emi = await Emi.findById(req.params.id);
  if (!emi) return res.status(404).json({ success: false, message: 'EMI not found.' });
  if (emi.status !== 'paid') return res.status(422).json({ success: false, message: 'EMI is not marked paid.' });
  if (emi.commissionProcessed) return res.status(422).json({ success: false, message: 'Commission already processed for this EMI.' });

  try {
    if (emi.emiNumber === -1) {
      await withRetry(() => releaseDownPaymentCommission(emi));
    } else {
      await withRetry(() => commissionService.processEmiCommission(emi));
    }

    await auditService.log(
      req,
      'emi.commission_retry_success',
      `Admin ${req.user.name} manually retried and successfully credited commission for EMI ${emi._id}`,
      emi
    );

    return res.json({ success: true, message: 'Commission credited successfully.' });
  } catch (err) {
    await auditService.log(
      req,
      'emi.commission_retry_failed',
      `Admin ${req.user.name} retried commission for EMI ${emi._id} — still failed: ${err.message}`,
      emi
    );
    return res.status(500).json({ success: false, message: `Retry failed: ${err.message}` });
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

const STEP_LABELS = {
  0: 'Booking token',
  99: 'Registry / final settlement',
};
function stepLabel(emiNumber) {
  if (STEP_LABELS[emiNumber] !== undefined) return STEP_LABELS[emiNumber];
  if (emiNumber > 0) return `EMI ${emiNumber}`;
  if (emiNumber < 0) return `Down payment ${Math.abs(emiNumber)}`;
  return `Step ${emiNumber}`;
}

// GET /api/admin/emi-dues
// Dashboard of open (pending/overdue) installment lines across all bookings,
// bucketed into Past due / Due today / Due in 7 days, plus an "All open" view.
async function dues(req, res) {
  await Emi.updateMany({ status: 'pending', dueDate: { $lt: new Date() } }, { status: 'overdue' });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const in7Days = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

  const baseFilter = { status: { $in: ['pending', 'overdue'] } };
  if (req.query.project_id) {
    const bookingIds = await Booking.find({ project: req.query.project_id }).distinct('_id');
    baseFilter.booking = { $in: bookingIds };
  }

  const bucket = req.query.bucket || 'all'; // all | past_due | due_today | due_in_7
  const filter = { ...baseFilter };
  if (bucket === 'past_due') filter.dueDate = { $lt: startOfToday };
  else if (bucket === 'due_today') filter.dueDate = { $gte: startOfToday, $lt: endOfToday };
  else if (bucket === 'due_in_7') filter.dueDate = { $gte: endOfToday, $lt: in7Days };

  if (req.query.search && req.query.search.trim()) {
    const re = new RegExp(req.query.search.trim(), 'i');
    const [matchedCustomers, matchedPlots] = await Promise.all([
      require('../../models/Customer').find({ name: re }).distinct('_id'),
      Plot.find({ plotNumber: re }).distinct('_id'),
    ]);
    const bookingIds = await Booking.find({
      $or: [{ customer: { $in: matchedCustomers } }, { plot: { $in: matchedPlots } }],
    }).distinct('_id');
    filter.booking = filter.booking ? { $in: bookingIds.filter((id) => filter.booking.$in?.some((b) => b.equals(id))) } : { $in: bookingIds };
  }

  const page = parseInt(req.query.page) || 1;
  const limit = 25;
  const skip = (page - 1) * limit;

  const allMatching = await Emi.find(filter)
    .populate({ path: 'booking', populate: [{ path: 'customer' }, { path: 'plot' }, { path: 'project' }] })
    .sort({ dueDate: 1 });

  // Collapse every EMI line into one row per booking, so a booking with 24
  // pending EMIs shows as one row (with a count) instead of 24 separate rows.
  const groupedMap = new Map();
  for (const e of allMatching) {
    const key = e.booking?._id ? String(e.booking._id) : `no-booking-${e._id}`;
    if (!groupedMap.has(key)) {
      groupedMap.set(key, {
        _id: key,
        emiCount: 0,
        dueDate: e.dueDate,
        remaining: 0,
        hasOverdue: false,
        client: e.booking?.customer?.name || null,
        clientPhone: e.booking?.customer?.phone || null,
        project: e.booking?.project?.name || null,
        plot: e.booking?.plot?.plotNumber || null,
        bookingId: e.booking?._id || null,
        bookingNumber: e.booking?.bookingNumber || null,
      });
    }
    const g = groupedMap.get(key);
    g.emiCount += 1;
    g.remaining += e.amount || 0;
    if (e.dueDate < g.dueDate) g.dueDate = e.dueDate; // nearest due date wins
    if (e.status === 'overdue') g.hasOverdue = true;
  }
  const grouped = Array.from(groupedMap.values()).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const total = grouped.length;
  const lines = grouped.slice(skip, skip + limit);

  const [, , counts, sums] = await Promise.all([
    null,
    null,
    Promise.all([
      Emi.countDocuments(baseFilter),
      Emi.countDocuments({ ...baseFilter, dueDate: { $lt: startOfToday } }),
      Emi.countDocuments({ ...baseFilter, dueDate: { $gte: startOfToday, $lt: endOfToday } }),
      Emi.countDocuments({ ...baseFilter, dueDate: { $gte: endOfToday, $lt: in7Days } }),
    ]),
    Promise.all([
      Emi.aggregate([{ $match: { ...baseFilter, dueDate: { $lt: startOfToday } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Emi.aggregate([{ $match: { ...baseFilter, dueDate: { $gte: startOfToday, $lt: endOfToday } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Emi.aggregate([{ $match: { ...baseFilter, dueDate: { $gte: endOfToday, $lt: in7Days } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Emi.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]),
  ]);

  const [allOpenCount, pastDueCount, dueTodayCount, dueIn7Count] = counts;
  const [pastDueSum, dueTodaySum, dueIn7Sum, pageSum] = sums;

  res.json({
    data: lines.map((g) => ({
      _id: g._id,
      step: `${g.emiCount} EMI${g.emiCount > 1 ? 's' : ''} due`,
      dueDate: g.dueDate,
      remaining: g.remaining,
      status: g.hasOverdue ? 'overdue' : 'pending',
      client: g.client,
      clientPhone: g.clientPhone,
      project: g.project,
      plot: g.plot,
      bookingId: g.bookingId,
      bookingNumber: g.bookingNumber,
    })),
    meta: { page, limit, total, lastPage: Math.ceil(total / limit) },
    summary: {
      allOpen: allOpenCount,
      pastDue: pastDueCount,
      dueToday: dueTodayCount,
      dueIn7: dueIn7Count,
      pastDueAmount: pastDueSum[0]?.total || 0,
      dueTodayAmount: dueTodaySum[0]?.total || 0,
      dueIn7Amount: dueIn7Sum[0]?.total || 0,
      pageRemaining: pageSum[0]?.total || 0,
    },
  });
}

async function update(req, res) {
  const Emi = require('../../models/Emi');
  const { isSuperAdmin } = require('../../utils/userHelpers');
  const emi = await Emi.findById(req.params.id);
  if (!emi) return res.status(404).json({ message: 'EMI not found.' });
  if (emi.status === 'paid') {
    return res.status(422).json({ message: 'Cannot edit an already-paid installment. Reverse the payment first.' });
  }
  if (emi.editRequest && emi.editRequest.status === 'pending') {
    return res.status(422).json({ message: 'This installment already has an edit pending Super Admin approval.' });
  }

  const booking = await Booking.findById(emi.booking);

  // Installments only exist once a booking is approved (generateEmis runs
  // on approval), so this should rarely trigger — but block it explicitly
  // in case a booking's approval gets reversed or an edit slips through
  // some other path. No one, not even Super Admin, edits an unapproved
  // booking's schedule — it isn't final yet.
  if (booking && booking.approvalStatus !== 'approved') {
    return res.status(422).json({ message: 'This booking is still pending approval — installments cannot be edited until it is approved.' });
  }

  // Sub Admin editing DP/EMI on a booking that's already confirmed (active)
  // → hold the edit for Super Admin review instead of applying it directly.
  // Super Admin's own edits still apply immediately.
  if (!isSuperAdmin(req.user) && booking && booking.status === 'active') {
    emi.editRequest = {
      status: 'pending',
      proposedAmount: req.body.amount !== undefined ? Number(req.body.amount) : emi.amount,
      proposedDueDate: req.body.dueDate !== undefined ? req.body.dueDate : emi.dueDate,
      proposedRemarks: req.body.remarks !== undefined ? req.body.remarks : emi.remarks,
      requestedBy: req.user._id,
      requestedAt: new Date(),
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
    };
    await emi.save();

    await auditService.log(
      req,
      'emi.edit_requested',
      `Sub Admin ${req.user.name} requested an edit to installment #${emi.emiNumber} for booking ${booking.bookingNumber} — awaiting Super Admin approval`,
      emi
    );

    return res.json({ message: 'Edit submitted for Super Admin approval.', data: emi, pendingApproval: true });
  }
  if (emi.commissionProcessed) {
    return res.status(422).json({ message: 'Commission for this installment has already been processed — it cannot be edited.' });
  }

  if (req.body.dueDate !== undefined) emi.dueDate = req.body.dueDate;
  if (req.body.remarks !== undefined) emi.remarks = req.body.remarks;

  // Amount changed → recalculate sqftPortion using the SAME formula used
  // at booking creation (services/bookingService.js:generateEmis), so
  // commission stays correct for the new amount. Without this, editing an
  // amount silently left the old sqftPortion in place and broke the
  // commission preview / grand-total review shown on the booking detail page.
  if (req.body.amount !== undefined && Number(req.body.amount) !== emi.amount) {
    const newAmount = Number(req.body.amount);
    const oldAmount = emi.amount;
    const booking = await Booking.findById(emi.booking);
    const pricePerSqft = booking ? Number(booking.pricePerSqft) || 0 : 0;
    const totalAmount = booking ? Number(booking.totalAmount) || 0 : 0;
    const plcAmount = booking ? Number(booking.plcAmount) || 0 : 0;
    const baseAmount = Math.max(totalAmount - plcAmount, 0);
    const commissionRatio = totalAmount > 0 ? baseAmount / totalAmount : 1;
    const sqftFor = (amt) =>
      pricePerSqft > 0 ? Math.round(((Number(amt) * commissionRatio) / pricePerSqft) * 100) / 100 : 0;

    emi.amount = newAmount;
    emi.sqftPortion = sqftFor(newAmount);

    // If this is a DP-type installment (created via "Add DP Installment" or
    // the original booking DP), an amount edit should shift the difference
    // to/from the DP remainder line too — same logic as addDpInstallment —
    // so the total DP due stays accurate instead of drifting out of sync.
    if (emi.emiNumber < 0) {
      const delta = newAmount - oldAmount; // +ve = took more from remainder, -ve = give some back
      const remainderEmi = await Emi.findOne({
        booking: emi.booking,
        emiNumber: { $lt: 0 },
        status: 'pending',
        _id: { $ne: emi._id },
      }).sort({ amount: -1 });

      if (remainderEmi) {
        const newRemainder = Math.max(Number(remainderEmi.amount) - delta, 0);
        remainderEmi.amount = newRemainder;
        remainderEmi.sqftPortion = sqftFor(newRemainder);
        await remainderEmi.save();
      }
    }
  }

  await emi.save();
  await syncBookingTotals(emi.booking);

  await auditService.log(
    req,
    'emi.edited',
    `Admin ${req.user.name} edited installment #${emi.emiNumber} for booking ${emi.booking} (amount/date/remarks)`,
    emi
  );

  return res.json({ message: 'Installment updated.', data: emi });
}

// POST /api/admin/emis/:id/approve-edit — Super Admin only (route-gated).
// Applies the pending edit request the same way `update` would have,
// including the sqftPortion recalculation and DP-remainder adjustment.
async function approveEdit(req, res) {
  const emi = await Emi.findById(req.params.id);
  if (!emi) return res.status(404).json({ message: 'EMI not found.' });
  if (!emi.editRequest || emi.editRequest.status !== 'pending') {
    return res.status(422).json({ message: 'No pending edit request on this installment.' });
  }

  const { proposedAmount, proposedDueDate, proposedRemarks } = emi.editRequest;
  const oldAmount = emi.amount;

  if (proposedDueDate !== undefined && proposedDueDate !== null) emi.dueDate = proposedDueDate;
  if (proposedRemarks !== undefined) emi.remarks = proposedRemarks;

  if (proposedAmount !== undefined && proposedAmount !== null && Number(proposedAmount) !== oldAmount) {
    const newAmount = Number(proposedAmount);
    const booking = await Booking.findById(emi.booking);
    const pricePerSqft = booking ? Number(booking.pricePerSqft) || 0 : 0;
    const totalAmount = booking ? Number(booking.totalAmount) || 0 : 0;
    const plcAmount = booking ? Number(booking.plcAmount) || 0 : 0;
    const baseAmount = Math.max(totalAmount - plcAmount, 0);
    const commissionRatio = totalAmount > 0 ? baseAmount / totalAmount : 1;
    const sqftFor = (amt) =>
      pricePerSqft > 0 ? Math.round(((Number(amt) * commissionRatio) / pricePerSqft) * 100) / 100 : 0;

    emi.amount = newAmount;
    emi.sqftPortion = sqftFor(newAmount);

    if (emi.emiNumber < 0) {
      const delta = newAmount - oldAmount;
      const remainderEmi = await Emi.findOne({
        booking: emi.booking,
        emiNumber: { $lt: 0 },
        status: 'pending',
        _id: { $ne: emi._id },
      }).sort({ amount: -1 });

      if (remainderEmi) {
        const newRemainder = Math.max(Number(remainderEmi.amount) - delta, 0);
        remainderEmi.amount = newRemainder;
        remainderEmi.sqftPortion = sqftFor(newRemainder);
        await remainderEmi.save();
      }
    }
  }

  emi.editRequest.status = 'approved';
  emi.editRequest.reviewedBy = req.user._id;
  emi.editRequest.reviewedAt = new Date();
  await emi.save();
  await syncBookingTotals(emi.booking);

  await auditService.log(
    req,
    'emi.edit_approved',
    `Super Admin ${req.user.name} approved the pending edit on installment #${emi.emiNumber} for booking ${emi.booking}`,
    emi
  );

  return res.json({ message: 'Edit approved and applied.', data: emi });
}

// POST /api/admin/emis/:id/reject-edit — Super Admin only (route-gated).
async function rejectEdit(req, res) {
  const { rejection_reason } = req.body;
  const emi = await Emi.findById(req.params.id);
  if (!emi) return res.status(404).json({ message: 'EMI not found.' });
  if (!emi.editRequest || emi.editRequest.status !== 'pending') {
    return res.status(422).json({ message: 'No pending edit request on this installment.' });
  }

  emi.editRequest.status = 'rejected';
  emi.editRequest.reviewedBy = req.user._id;
  emi.editRequest.reviewedAt = new Date();
  emi.editRequest.rejectionReason = rejection_reason || null;
  await emi.save();

  await auditService.log(
    req,
    'emi.edit_rejected',
    `Super Admin ${req.user.name} rejected the pending edit on installment #${emi.emiNumber} for booking ${emi.booking}`,
    emi
  );

  return res.json({ message: 'Edit request rejected.', data: emi });
}

// POST /api/admin/bookings/:id/dp-installments
// Lets Admin record a new Down Payment part-payment AFTER the booking has
// already been created — for the common real-world case where the 30% DP
// isn't paid in one shot but arrives in several unplanned pieces over time.
async function addDpInstallment(req, res) {
  const { amount, due_date, remarks } = req.body;
  if (!amount || Number(amount) <= 0) {
    return res.status(422).json({ message: 'A valid amount is required.' });
  }

  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found.' });
  if (booking.status !== 'active') {
    return res.status(422).json({ message: 'Only active bookings can have new installments added.' });
  }

  // DP-type entries use negative emiNumbers (-1, -2, -3, ...). Find the next
  // free slot so this stacks after any existing DP/DP2/extra-DP entries.
  const existingDpEmis = await Emi.find({ booking: booking._id, emiNumber: { $lt: 0 } }).sort({ emiNumber: 1 });
  const nextEmiNumber = existingDpEmis.length ? existingDpEmis[0].emiNumber - 1 : -1;

  // Same sqftPortion formula used everywhere else (bookingService.generateEmis,
  // emiController.update) so commission calculates correctly from day one.
  const pricePerSqft = Number(booking.pricePerSqft) || 0;
  const totalAmount = Number(booking.totalAmount) || 0;
  const plcAmount = Number(booking.plcAmount) || 0;
  const baseAmount = Math.max(totalAmount - plcAmount, 0);
  const commissionRatio = totalAmount > 0 ? baseAmount / totalAmount : 1;
  const sqftFor = (amt) =>
    pricePerSqft > 0 ? Math.round(((Number(amt) * commissionRatio) / pricePerSqft) * 100) / 100 : 0;
  const sqftPortion = sqftFor(Number(amount));

  // This installment is a piece of the 30% DP target, not extra money on
  // top of it — so subtract it from whichever DP-type line still holds the
  // unpaid remainder, so the total DP due stays accurate instead of growing.
  const remainderEmi = await Emi.findOne({
    booking: booking._id,
    emiNumber: { $lt: 0 },
    status: 'pending',
  }).sort({ amount: -1 });

  if (remainderEmi) {
    const newRemainder = Math.max(Number(remainderEmi.amount) - Number(amount), 0);
    remainderEmi.amount = newRemainder;
    remainderEmi.sqftPortion = sqftFor(newRemainder);
    await remainderEmi.save();
  }

  const emi = await Emi.create({
    booking: booking._id,
    agent: booking.agent,
    emiNumber: nextEmiNumber,
    amount: Number(amount),
    sqftPortion,
    dueDate: due_date ? new Date(due_date) : new Date(),
    status: 'pending',
    commissionProcessed: false,
    remarks: remarks || null,
    createdBy: req.user._id,
  });
  await syncBookingTotals(booking._id);

  await auditService.log(
    req,
    'emi.dp_installment_added',
    `Admin ${req.user.name} added a new Down Payment installment of ₹${amount} to booking ${booking.bookingNumber}`,
    emi
  );

  return res.status(201).json({ message: 'New Down Payment installment added.', data: emi });
}

// GET /api/admin/emis/edit-requests
// Central list of every installment currently awaiting Super Admin review —
// so Sub Admin can see what they've submitted, and Super Admin doesn't have
// to open each booking individually to find pending edits.
async function editRequests(req, res) {
  const { isSuperAdmin } = require('../../utils/userHelpers');

  // Super Admin's action queue defaults to just 'pending' (what they need to
  // act on). Sub Admin's own history defaults to ALL of their requests
  // (pending/approved/rejected) so they can see what happened after review,
  // not just the ones still waiting. ?status=all|pending|approved|rejected
  // overrides the default for either role.
  const filter = { 'editRequest.status': { $ne: 'none' } };

  if (!isSuperAdmin(req.user)) {
    filter['editRequest.requestedBy'] = req.user._id;
    if (req.query.status && req.query.status !== 'all') {
      filter['editRequest.status'] = req.query.status;
    }
  } else {
    filter['editRequest.status'] = req.query.status && req.query.status !== 'all' ? req.query.status : 'pending';
  }

  const emis = await Emi.find(filter)
    .populate({ path: 'booking', populate: [{ path: 'customer' }, { path: 'plot' }, { path: 'project' }] })
    .populate('editRequest.requestedBy')
    .populate('editRequest.reviewedBy')
    .sort({ 'editRequest.requestedAt': -1 });

  res.json({ data: emis });
}

module.exports = { index, bookingEmis, markPaid, overdue, dues, update, addDpInstallment, approveEdit, rejectEdit, editRequests, commissionPending, retryCommission };