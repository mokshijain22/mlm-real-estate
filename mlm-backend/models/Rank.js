const mongoose = require('mongoose');

const rankSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    abbreviation: { type: String, required: true },
    minGroupSales: { type: Number, required: true, default: 0 }, // renamed from min_group_sqft, integer per later migration
    minTeamSize: { type: Number, default: 0 },
    bvPoints: { type: Number, required: true },
    pvPoints: { type: Number, required: true },
    sortOrder: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Rank', rankSchema);
