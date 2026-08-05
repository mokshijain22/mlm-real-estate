const mongoose = require('mongoose');

const paymentPlanSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    name: { type: String, required: true },
    bookingAmount: { type: Number, default: 0 }, // token, flat ₹
    downPaymentAmount: { type: Number, default: 0 }, // legacy flat ₹ value, kept for old records — no longer edited from the template UI
    downPaymentPercent: { type: Number, default: 0 }, // % of plot price — this already INCLUDES the booking amount, not on top of it
    isDefault: { type: Boolean, default: false },
    emiPercent: { type: Number, default: 0 }, // % of selling price, each EMI
    emiCount: { type: Number, default: 0 }, // number of EMI months
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PaymentPlan', paymentPlanSchema);