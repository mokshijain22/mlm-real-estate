const mongoose = require('mongoose');

const paymentPlanSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    name: { type: String, required: true },
    bookingAmount: { type: Number, default: 0 },
    editableAtBooking: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },
    plcEnabled: { type: Boolean, default: false },
    plcOptions: [
      {
        label: { type: String, required: true },
        percent: { type: Number, default: 0 },
      },
    ],
    downPaymentStages: [
      {
        label: { type: String, required: true },
        percent: { type: Number, default: 0 },
      },
    ],
    emiPercent: { type: Number, default: 0 }, // % of selling price, each EMI
    emiCount: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PaymentPlan', paymentPlanSchema);