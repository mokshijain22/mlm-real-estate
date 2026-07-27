const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Emi = require('../models/Emi');
const Plot = require('../models/Plot');
const Rank = require('../models/Rank');
const User = require('../models/User');
const { isSuperAdmin, isSubAdmin } = require('../utils/userHelpers');
const { checkAndUpgradeRank } = require('./rankService');

async function createBooking(data, actingUser) {
  const session = await mongoose.startSession();
  try {
    let createdBooking;

    await session.withTransaction(async () => {
      const plot = await Plot.findById(data.plot_id).session(session);
      if (!plot) throw new Error('Plot not found.');

      const sellingAgent = await User.findById(data.agent_id).session(session);
      if (!sellingAgent) throw new Error('Agent not found.');

      let agentRankId = sellingAgent.rank;
      if (!agentRankId) {
        const lowestRank = await Rank.findOne().sort({ sortOrder: 1 }).session(session);
        agentRankId = lowestRank ? lowestRank._id : null;
      }

      if (plot.status !== 'available') {
        throw new Error('Plot is not available for booking');
      }

      const totalArea = plot.totalArea;
      const pricePerSqft = Number(data.price_per_sqft);
      const totalAmount = Number(totalArea) * pricePerSqft;
      const bookingAmount = Number(data.booking_amount);
      const remainingAmount = totalAmount - bookingAmount;
      const emiMonths = parseInt(data.emi_months, 10);
      const emiAmount = emiMonths > 0 ? remainingAmount / emiMonths : 0;

      const actingIsAdmin = actingUser && (isSuperAdmin(actingUser) || isSubAdmin(actingUser));

      const totalBookings = await Booking.countDocuments({}).session(session);
      const bookingNumber = 'BK-' + String(totalBookings + 1).padStart(4, '0');

      const [booking] = await Booking.create(
        [
          {
            bookingNumber,
            customer: data.customer_id,
            plot: data.plot_id,
            project: plot.project,
            agent: data.agent_id,
            agentRank: agentRankId,

            totalArea,
            pricePerSqft,
            totalAmount,
            bookingAmount,
            remainingAmount,
            emiMonths,
            emiAmount,
            paymentMode: data.payment_mode,
            status: 'active',
            approvalStatus: actingIsAdmin ? 'approved' : 'pending',
            approvedBy: actingIsAdmin ? actingUser._id : null,
            approvedAt: actingIsAdmin ? new Date() : null,
            bookingDate: new Date(),
            notes: data.notes || null,
            createdBy: actingUser ? actingUser._id : data.agent_id,

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
            plcAmount: Number(data.plc_amount) || 0,
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
          },
        ],
        { session }
      );

      const plotStatus = actingIsAdmin ? 'sold' : 'booked';
      plot.status = plotStatus;
      await plot.save({ session });

      if (booking.approvalStatus === 'approved') {
        await generateEmis(booking, session);
      }

      createdBooking = booking;
    });

    if (createdBooking && createdBooking.approvalStatus === 'approved') {
      const sellingAgent = await User.findById(data.agent_id);
      await checkAndUpgradeRank(sellingAgent);
    }

    return createdBooking;
  } finally {
    session.endSession();
  }
}

async function generateEmis(booking, session = null) {
  const emis = [];
  for (let i = 1; i <= booking.emiMonths; i++) {
    const dueDate = new Date(booking.bookingDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    emis.push({
      booking: booking._id,
      agent: booking.agent,
      emiNumber: i,
      amount: booking.emiAmount,
      sqftPortion: booking.totalArea / booking.emiMonths,
      dueDate,
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