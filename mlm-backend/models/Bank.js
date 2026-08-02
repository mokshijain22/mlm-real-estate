const mongoose = require('mongoose');

const bankSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g. "HDFC Bank - Current A/c"
    accountNumber: { type: String, default: null },
    ifscCode: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bank', bankSchema);