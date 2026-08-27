const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Emi = require('../models/Emi');
const Plot = require('../models/Plot');
const Rank = require('../models/Rank');
const User = require('../models/User');
const { isSuperAdmin, isSubAdmin } = require('../utils/userHelpers');
const { checkAndUpgradeRank } = require('./rankService');
const commissionService = require('./commissionService');

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function createBooking(data, actingUser) {
  const session = await mongoose.startSession();
  try {
    let createdBooking;

    await session.withTransaction(async () => {
      const plot = await Plot.findById(data.plot_id).session(session);
      if (!plot) throw new Error('Plot not found.');

      const sellingAgent = data.agent_id ? await User.findById(data.agent_id).session(session) : null;
      if (data.agent_id && !sellingAgent) throw new Error('Agent not found.');

      let agentRankId = null;
      if (sellingAgent) {
        agentRankId = sellingAgent.rank;
        if (!agentRankId) {
          const lowestRank = await Rank.findOne().sort({ sortOrder: 1 }).session(session);
          agentRankId = lowestRank ? lowestRank._id : null;
        }
      }

      if (plot.status !== 'available') {
        throw new Error('Plot is not available for booking');
      }

      const totalArea = data.plot_area !== undefined && data.plot_area !== '' ? Number(data.plot_area) : plot.totalArea;
      const pricePerSqft = Number(data.price_per_sqft);
      const baseAmount = Number(totalArea) * pricePerSqft;
      const plcPercent = data.plc_percent !== undefined && data.plc_percent !== '' ? Number(data.plc_percent) : (Number(plot.plcPercent) || 0);
      const plcAmount = Math.round((baseAmount * plcPercent) / 100);
      const totalAmount = baseAmount + plcAmount;
      const bookingAmount = Number(data.booking_amount);
      const downPaymentAmount = Number(data.down_payment_amount) || 0;
      const downPaymentDueDate = data.down_payment_due_date
        ? new Date(data.down_payment_due_date)
        : downPaymentAmount > 0
        ? addDays(new Date(), 30)
        : null;
      const downPayment2Amount = Number(data.down_payment2_amount) || 0;
      const downPayment2DueDate = data.down_payment2_due_date ? new Date(data.down_payment2_due_date) : null;
      const additionalDownPayments = Array.isArray(data.additional_down_payments)
        ? data.additional_down_payments
            .map((dp) => ({
              amount: Number(dp.amount) || 0,
              dueDate: dp.due_date ? new Date(dp.due_date) : null,
            }))
            .filter((dp) => dp.amount > 0)
        : [];
      const additionalDownPaymentsTotal = additionalDownPayments.reduce((sum, dp) => sum + dp.amount, 0);
      const registryAmount = Number(data.registry_amount) || 0;
      const registryDueDate = data.registry_due_date ? new Date(data.registry_due_date) : null;
      const emiDueDates = Array.isArray(data.emi_due_dates)
        ? data.emi_due_dates.map((d) => (d ? new Date(d) : null))
        : [];
      const emiAmounts = Array.isArray(data.emi_amounts)
        ? data.emi_amounts.map((a) => (a !== null && a !== undefined && a !== '' ? Number(a) : null))
        : [];
      const remainingAmount =
        totalAmount - bookingAmount - downPaymentAmount - downPayment2Amount - additionalDownPaymentsTotal - registryAmount;
      const emiMonths = parseInt(data.emi_months, 10);
      const emiAmount = emiMonths > 0 ? remainingAmount / emiMonths : 0;

      // Snapshot Company's ₹/sqft share NOW — Project pool minus what seller +
      // upline actually earn (after their caps), a true leftover. Reuses the
      // exact calculation the wizard's preview uses, so the number confirmed
      // in the wizard always matches what actually gets saved.
      let companyRatePerSqft = 0;
      if (sellingAgent) {
        const bookingProject = await Plot.findById(data.plot_id).session(session).populate('project');
        const pool = bookingProject?.project?.commissionPool || 0;
        const snapshotPreview = await commissionService.previewCommissionForData({
          agentId: data.agent_id,
          pricePerSqft,
          emiAmount,
          emiMonths: emiMonths || 1,
          paymentMode: data.payment_mode,
          commissionPool: pool,
          sellerCapPerSqft: Number(data.commission_cap_per_sqft) || 0,
          uplineCapsPerSqft: Array.isArray(data.upline_commission_caps_per_sqft)
            ? data.upline_commission_caps_per_sqft.map((v) => Number(v) || 0)
            : [],
        });
        const companyRow = snapshotPreview.find((r) => r.isCompany);
        companyRatePerSqft = companyRow ? Number(companyRow.points_per_sf) || 0 : 0;
      }

      // Only Super Admin's own bookings are auto-approved. Sub Admin
      // bookings must go through the approval flow like an agent's booking
      // would — previously Sub Admin was bundled in with Super Admin here,
      // which silently skipped approval for every Sub Admin booking.
      const actingIsAdmin = actingUser && isSuperAdmin(actingUser);

      const totalBookings = await Booking.countDocuments({}).session(session);
      const bookingNumber = 'BK-' + String(totalBookings + 1).padStart(4, '0');

      const [booking] = await Booking.create(
        [
          {
            bookingNumber,
            customer: data.customer_id,
            plot: data.plot_id,
            project: plot.project,
            agent: data.agent_id || null,
            agentRank: agentRankId,

            totalArea,
            pricePerSqft,
            totalAmount,
            bookingAmount,
            downPaymentAmount,
            downPaymentDueDate,
            downPayment2Amount,
            downPayment2DueDate,
            registryAmount,
            registryDueDate,
            emiDueDates,
            emiAmounts,
            paymentPlanKey: data.payment_plan_key || 'standard',
            remainingAmount,
            emiMonths,
            emiAmount,
            paymentMode: data.payment_mode,
            transactionId: data.transaction_id || null,
            chequeNumber: data.cheque_number || null,
            chequeBankName: data.cheque_bank_name || null,
            paymentDate: data.payment_date || null,
            paymentTime: data.payment_time || null,
            amountInWords: data.amount_in_words || null,
            collectedBy: data.collected_by || null,
            status: 'active',
            approvalStatus: actingIsAdmin ? 'approved' : 'pending',
            approvedBy: actingIsAdmin ? actingUser._id : null,
            approvedAt: actingIsAdmin ? new Date() : null,
            bookingDate: new Date(),
            notes: data.notes || null,
            createdBy: actingUser ? actingUser._id : data.agent_id || null,

            purchaseDetails: {
              fathersOrHusbandName: data.fathers_or_husband_name || null,
              gender: data.gender || null,
              maritalStatus: data.marital_status || null,
              dob: data.dob || null,
              age: data.age || null,
              religion: data.religion || null,
              nominationName: data.nomination_name || null,
              nominationRelation: data.nomination_relation || null,
            },
            plcAmount,
            plcPercent,
            paymentSchedule: {
              tokenDate: data.token_date || null,
              tokenAmount: Number(data.token_amount) || 0,
              dpDate: data.dp_date || null,
              dpAmount: Number(data.dp_amount) || 0,
              installmentDate: data.installment_date || null,
              installmentAmount: Number(data.installment_amount) || 0,
              specificCondition: data.specific_condition || null,
            },
            proposerName: data.proposer_name || null,
            commissionCapPerSqft: Number(data.commission_cap_per_sqft) || 0,
            uplineCommissionCapsPerSqft: Array.isArray(data.upline_commission_caps_per_sqft)
              ? data.upline_commission_caps_per_sqft.map((v) => Number(v) || 0)
              : [],
            companyRatePerSqft,
            executiveGaveDiscount: !!data.executive_gave_discount,
            executiveDiscountRemarks: data.executive_discount_remarks || null,
            documents: {
              idProof: data.documents?.id_proof || null,
              panCard: data.documents?.pan_card || null,
              nocCertificate: data.documents?.noc_certificate || null,
              agreementCopy: data.documents?.agreement_copy || null,
              sitePlan: data.documents?.site_plan || null,
            },
          },
        ],
        { session }
      );

      const plotStatus = actingIsAdmin ? 'sold' : 'booked';
      plot.totalArea = totalArea;
      plot.pricePerSqft = pricePerSqft;
      plot.plcPercent = plcPercent;
      plot.status = plotStatus;
      await plot.save({ session });

      if (booking.approvalStatus === 'approved') {
        await generateEmis(booking, session, additionalDownPayments);

        // If the token/booking-amount payment was collected right there in the
        // wizard (bank/receipt/remarks provided), mark that milestone paid
        // immediately instead of leaving it pending for a separate collection step.
        if (Number(booking.bookingAmount) > 0 && data.token_collected) {
          const tokenEmi = await Emi.findOne({ booking: booking._id, emiNumber: 0 }).session(session);
          if (tokenEmi) {
            tokenEmi.status = 'paid';
            tokenEmi.paidDate = data.payment_date || new Date();
            tokenEmi.paymentMode = data.payment_mode;
            tokenEmi.paymentReference = data.payment_reference || null;
            tokenEmi.bank = data.bank_id || null;
            tokenEmi.receiptId = data.receipt_id || null;
            tokenEmi.remarks = data.remarks || null;
            await tokenEmi.save({ session });
          }
        }
      }

      createdBooking = booking;
    });

    // Release the token's commission now — only if there's no Down Payment
    // milestone waiting (same rule the manual "mark paid" flow follows).
    if (createdBooking && data.token_collected && Number(createdBooking.bookingAmount) > 0) {
      const tokenEmi = await Emi.findOne({ booking: createdBooking._id, emiNumber: 0, status: 'paid' });
      if (tokenEmi && !tokenEmi.commissionProcessed) {
        const hasDownPayment = await Emi.exists({ booking: createdBooking._id, emiNumber: -1 });
        if (!hasDownPayment) {
          await commissionService.processEmiCommission(tokenEmi);
        }
      }
    }

    if (createdBooking && createdBooking.approvalStatus === 'approved' && data.agent_id) {
      const sellingAgent = await User.findById(data.agent_id);
      if (sellingAgent) await checkAndUpgradeRank(sellingAgent);
    }

    return createdBooking;
  } finally {
    session.endSession();
  }
}

async function generateEmis(booking, session = null, additionalDownPayments = []) {
  const pricePerSqft = Number(booking.pricePerSqft) || 0;
  // PLC is a location premium the customer pays on top of the base plot
  // price — it should NOT inflate the sqft that commissions are calculated
  // on. Scale every payment line down to its base-price share before
  // converting to sqft, so PLC money is collected and tracked (still shows
  // on the booking, still counts toward totalAmount) but contributes zero
  // extra commissionable sqft. Without this, every commission on this
  // booking silently included the PLC premium.
  const totalAmount = Number(booking.totalAmount) || 0;
  const plcAmount = Number(booking.plcAmount) || 0;
  const baseAmount = Math.max(totalAmount - plcAmount, 0);
  const commissionRatio = totalAmount > 0 ? baseAmount / totalAmount : 1;
  const sqftFor = (amount) =>
    pricePerSqft > 0 ? Math.round(((Number(amount) * commissionRatio) / pricePerSqft) * 100) / 100 : 0;

  const emis = [];

  if (Number(booking.bookingAmount) > 0) {
    emis.push({
      booking: booking._id,
      agent: booking.agent,
      emiNumber: 0,
      amount: booking.bookingAmount,
      sqftPortion: sqftFor(booking.bookingAmount),
      dueDate: booking.bookingDate,
      status: 'pending',
      commissionProcessed: false,
      createdBy: booking.createdBy,
    });
  }

  if (Number(booking.downPaymentAmount) > 0) {
    emis.push({
      booking: booking._id,
      agent: booking.agent,
      emiNumber: -1,
      amount: booking.downPaymentAmount,
      sqftPortion: sqftFor(booking.downPaymentAmount),
      dueDate: booking.downPaymentDueDate || addDays(new Date(booking.bookingDate), 30),
      status: 'pending',
      commissionProcessed: false,
      createdBy: booking.createdBy,
    });
  }

  if (Number(booking.downPayment2Amount) > 0) {
    emis.push({
      booking: booking._id,
      agent: booking.agent,
      emiNumber: -2,
      amount: booking.downPayment2Amount,
      sqftPortion: sqftFor(booking.downPayment2Amount),
      dueDate: booking.downPayment2DueDate || addDays(new Date(booking.bookingDate), 60),
      status: 'pending',
      commissionProcessed: false,
      createdBy: booking.createdBy,
    });
  }

  additionalDownPayments.forEach((dp, idx) => {
    if (Number(dp.amount) > 0) {
      emis.push({
        booking: booking._id,
        agent: booking.agent,
        emiNumber: -3 - idx, // -3, -4, -5, ... one per extra part-payment
        amount: dp.amount,
        sqftPortion: sqftFor(dp.amount),
        dueDate: dp.dueDate || addDays(new Date(booking.bookingDate), 60 + (idx + 1) * 30),
        status: 'pending',
        commissionProcessed: false,
        createdBy: booking.createdBy,
      });
    }
  });

  for (let i = 1; i <= booking.emiMonths; i++) {
    const override = Array.isArray(booking.emiDueDates) ? booking.emiDueDates[i - 1] : null;
    let dueDate = override ? new Date(override) : new Date(booking.bookingDate);
    if (!override) dueDate.setMonth(dueDate.getMonth() + i);

    // Use this EMI's individually-edited amount if the creator set one for
    // this slot, otherwise fall back to the uniform emiAmount. Previously
    // every EMI silently used the same emiAmount, ignoring per-row edits
    // made to EMI 2, 3, 4... on the booking creation screen.
    const amountOverride = Array.isArray(booking.emiAmounts) ? booking.emiAmounts[i - 1] : null;
    const thisAmount = amountOverride !== null && amountOverride !== undefined ? Number(amountOverride) : booking.emiAmount;

    emis.push({
      booking: booking._id,
      agent: booking.agent,
      emiNumber: i,
      amount: thisAmount,
      sqftPortion: sqftFor(thisAmount),
      dueDate,
      status: 'pending',
      commissionProcessed: false,
      createdBy: booking.createdBy,
    });
  }

  if (Number(booking.registryAmount) > 0) {
    const fallbackRegistryDate = new Date(booking.bookingDate);
    fallbackRegistryDate.setMonth(fallbackRegistryDate.getMonth() + Number(booking.emiMonths || 0) + 1);

    emis.push({
      booking: booking._id,
      agent: booking.agent,
      emiNumber: 99,
      amount: booking.registryAmount,
      sqftPortion: sqftFor(booking.registryAmount),
      dueDate: booking.registryDueDate || fallbackRegistryDate,
      status: 'pending',
      commissionProcessed: false,
      createdBy: booking.createdBy,
    });
  }

  const opts = session ? { session } : {};
  await Emi.insertMany(emis, opts);
}

async function cancelBooking(booking) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      booking.status = 'cancelled';
      await booking.save({ session });

      await Plot.findByIdAndUpdate(booking.plot, { status: 'available' }, { session });

      await Emi.updateMany(
        { booking: booking._id, status: { $in: ['pending', 'overdue'] } },
        { status: 'cancelled' },
        { session }
      );
    });
  } finally {
    session.endSession();
  }
}

module.exports = { createBooking, generateEmis, cancelBooking };