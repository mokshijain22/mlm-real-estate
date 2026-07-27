const mongoose = require('mongoose');

const rankHistorySchema = new mongoose.Schema(
  {
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    oldRank: { type: mongoose.Schema.Types.ObjectId, ref: 'Rank', default: null },
    newRank: { type: mongoose.Schema.Types.ObjectId, ref: 'Rank', required: true },
    groupSalesAtUpgrade: { type: Number, required: true, default: 0 }, // renamed from group_sqft_at_upgrade
    upgradedAt: { type: Date, required: true },
  },
  { timestamps: false }
);

module.exports = mongoose.model('RankHistory', rankHistorySchema);
