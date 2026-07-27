const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema(
  {
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pointsType: { type: String, enum: ['BV', 'PV'], required: true },
    amount: { type: Number, required: true },
    tdsAmount: { type: Number, required: true },
    netAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String, default: null },
    requestedAt: { type: Date, required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    paymentReference: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
