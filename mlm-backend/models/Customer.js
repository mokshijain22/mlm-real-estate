const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    customerCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, required: true, unique: true },
    alternatePhone: { type: String, default: null },
    address: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    pincode: { type: String, default: null },
    aadhaarNumber: { type: String, unique: true, sparse: true },
    panNumber: { type: String, unique: true, sparse: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

customerSchema.pre(/^find/, function (next) {
  if (this.getFilter().includeDeleted !== true) {
    this.where({ deletedAt: null });
  }
  next();
});

module.exports = mongoose.model('Customer', customerSchema);
