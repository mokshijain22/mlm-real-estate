const mongoose = require('mongoose');

const emiSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    emiNumber: { type: Number, required: true },
    amount: { type: Number, required: true },
    sqftPortion: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    paidDate: { type: Date, default: null },
    paymentMode: { type: String, enum: ['cash', 'online'], default: null },
    status: { type: String, enum: ['pending', 'paid', 'overdue', 'cancelled'], default: 'pending' },
    paymentReference: { type: String, default: null },
    commissionProcessed: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Emi', emiSchema);
