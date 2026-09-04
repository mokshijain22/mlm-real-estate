const mongoose = require('mongoose');

const emiSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    emiNumber: { type: Number, required: true },
    amount: { type: Number, required: true },
    sqftPortion: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    paidDate: { type: Date, default: null },
     paymentMode: { type: String, enum: ['cash', 'upi', 'net_banking', 'bank_transfer', 'cheque', 'card'], default: null },
    status: { type: String, enum: ['pending', 'paid', 'overdue', 'cancelled'], default: 'pending' },
    paymentReference: { type: String, default: null },
    bank: { type: mongoose.Schema.Types.ObjectId, ref: 'Bank', default: null },
    receiptId: { type: String, default: null },
    remarks: { type: String, default: null },
    amountReceived: { type: Number, default: null }, // actual amount paid; null until marked paid
    commissionProcessed: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // When a Sub Admin edits an installment on a booking that's already
    // confirmed (active), the edit is held here for Super Admin review
    // instead of applying immediately. Super Admin's own edits skip this
    // and apply directly.
    editRequest: {
      status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
      proposedAmount: { type: Number, default: null },
      proposedDueDate: { type: Date, default: null },
      proposedRemarks: { type: String, default: null },
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      requestedAt: { type: Date, default: null },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      reviewedAt: { type: Date, default: null },
      rejectionReason: { type: String, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Emi', emiSchema);
