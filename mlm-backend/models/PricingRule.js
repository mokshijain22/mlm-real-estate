const mongoose = require('mongoose');

const pricingRuleSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    name: { type: String, required: true },
    rate: { type: Number, required: true }, // ₹/sqft
    ownerMinimum: { type: Number, required: true }, // ₹/sqft
    status: { type: String, default: 'draft' }, // draft | active
    sortOrder: { type: Number, default: 0 }, // priority — lower = checked first

    conditions: {
      dateRange: {
        enabled: { type: Boolean, default: false },
        from: { type: Date, default: null },
        to: { type: Date, default: null },
      },
      selectedPlots: {
        enabled: { type: Boolean, default: false },
        plots: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Plot' }],
      },
      soldAreaThreshold: {
        enabled: { type: Boolean, default: false },
        sqft: { type: Number, default: 0 }, // rule applies once total sold area in project >= this
      },
      firstN: {
        enabled: { type: Boolean, default: false },
        count: { type: Number, default: 0 }, // rule applies to first N plots/units booked (early-bird)
      },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

pricingRuleSchema.virtual('pool').get(function () {
  return (this.rate || 0) - (this.ownerMinimum || 0);
});
pricingRuleSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('PricingRule', pricingRuleSchema);