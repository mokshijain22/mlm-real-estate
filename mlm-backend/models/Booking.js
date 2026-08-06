const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    plot: { type: mongoose.Schema.Types.ObjectId, ref: 'Plot', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    agentRank: { type: mongoose.Schema.Types.ObjectId, ref: 'Rank', default: null }, // rank snapshot at booking time

    totalArea: { type: Number, required: true },
    pricePerSqft: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    bookingAmount: { type: Number, required: true },
    downPaymentAmount: { type: Number, default: 0 },
    downPaymentDueDate: { type: Date, default: null },
    downPayment2Amount: { type: Number, default: 0 },
    downPayment2DueDate: { type: Date, default: null },
    registryAmount: { type: Number, default: 0 },
    registryDueDate: { type: Date, default: null },
    emiDueDates: [{ type: Date }],
    paymentPlanKey: { type: String, default: 'standard' },
    remainingAmount: { type: Number, required: true },
    emiMonths: { type: Number, required: true },
    emiAmount: { type: Number, required: true },
    paymentMode: { type: String, enum: ['cash', 'upi', 'net_banking', 'bank_transfer', 'cheque', 'card'], required: true },
    transactionId: { type: String, default: null }, // for online payments
    chequeNumber: { type: String, default: null }, // for cheque payments
    chequeBankName: { type: String, default: null },
    paymentDate: { type: Date, default: null },
    paymentTime: { type: String, default: null }, // e.g. "14:30", mainly for cash
    amountInWords: { type: String, default: null },
    collectedBy: { type: String, default: null },
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },

    // agent approval flow
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvalReason: { type: String, default: null },
    rejectionReason: { type: String, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },

    // --- Purchase Details (mirrors the physical Booking Form) ---
    purchaseDetails: {
      fathersOrHusbandName: { type: String, default: null },
      gender: { type: String, enum: ['male', 'female', 'other', null], default: null },
      maritalStatus: { type: String, default: null },
      dob: { type: Date, default: null },
      age: { type: Number, default: null },
      religion: { type: String, default: null },
      nominationName: { type: String, default: null },
      nominationRelation: { type: String, default: null },
    },

     plcAmount: { type: Number, default: 0 },
    plcPercent: { type: Number, default: 0 },
    commissionCapPerSqft: { type: Number, default: 0 }, // 0 = uncapped; caps the seller's per-sqft commission
    uplineCommissionCapsPerSqft: { type: [Number], default: [] }, // 0/absent = uncapped; index-aligned to the upline rank-difference rows shown in the commission preview (L2, L3-if-upline, etc.) — does NOT include the Company row
    companyRatePerSqft: { type: Number, default: 0 }, // Company's ₹/sqft share, snapshotted at booking time (Project pool minus top executive's slab at that moment) so later Project rate changes never alter an already-booked commission
    executiveGaveDiscount: { type: Boolean, default: false },
    executiveDiscountRemarks: { type: String, default: null },

    paymentSchedule: {
      tokenDate: { type: Date, default: null },
      tokenAmount: { type: Number, default: 0 },
      dpDate: { type: Date, default: null },
      dpAmount: { type: Number, default: 0 },
      installmentDate: { type: Date, default: null },
      installmentAmount: { type: Number, default: 0 },
      specificCondition: { type: String, default: null },
    },

    proposerName: { type: String, default: null },

    documents: {
      idProof: { type: String, default: null },
      panCard: { type: String, default: null },
      nocCertificate: { type: String, default: null },
      agreementCopy: { type: String, default: null },
      sitePlan: { type: String, default: null },
    },

    bookingDate: { type: Date, required: true },
    notes: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

bookingSchema.pre(/^find/, function (next) {
  if (this.getFilter().includeDeleted !== true) {
    this.where({ deletedAt: null });
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
