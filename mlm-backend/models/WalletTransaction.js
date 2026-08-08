const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    category: {
      type: String,
      enum: ['emi_commission', 'deposit_commission', 'rank_difference', 'withdrawal', 'tds_deduction'],
      required: true,
    },
    pointsType: { type: String, enum: ['BV', 'PV'], required: true },
    amount: { type: Number, required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    emi: { type: mongoose.Schema.Types.ObjectId, ref: 'Emi', default: null },
    // The sqft this credit was actually paid for. Usually equals emi.sqftPortion,
    // but for the combined Deposit+DownPayment payout it's the SUM of both EMIs'
    // sqft while `emi` only points at one of them — so this is the source of
    // truth for reconstructing Company's share later, not emi.sqftPortion.
    sqftPortion: { type: Number, default: null },
    withdrawal: { type: mongoose.Schema.Types.ObjectId, ref: 'WithdrawalRequest', default: null },
    remark: { type: String, required: true },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
