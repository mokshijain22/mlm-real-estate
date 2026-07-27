const mongoose = require('mongoose');

const kycVerificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    aadhaarNumber: { type: String, default: null },
    aadhaarFront: { type: String, default: null },
    aadhaarBack: { type: String, default: null },
    panNumber: { type: String, default: null },
    panDocument: { type: String, default: null },
    bankAccountNumber: { type: String, default: null },
    bankIfscCode: { type: String, default: null },
    bankName: { type: String, default: null },
    bankProof: { type: String, default: null },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('KycVerification', kycVerificationSchema);
