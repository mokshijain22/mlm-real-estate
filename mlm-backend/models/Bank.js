const mongoose = require('mongoose');

const bankSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g. "HDFC Bank - Current A/c"
    accountHolderName: { type: String, default: null },
    accountNumber: { type: String, default: null },
    ifscCode: { type: String, default: null },
    branch: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bank', bankSchema);