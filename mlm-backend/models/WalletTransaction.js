const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    category: {
      type: String,
      enum: ['emi_commission', 'rank_difference', 'withdrawal', 'tds_deduction'],
      required: true,
    },
    pointsType: { type: String, enum: ['BV', 'PV'], required: true },
    amount: { type: Number, required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    emi: { type: mongoose.Schema.Types.ObjectId, ref: 'Emi', default: null },
    withdrawal: { type: mongoose.Schema.Types.ObjectId, ref: 'WithdrawalRequest', default: null },
    remark: { type: String, required: true },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
