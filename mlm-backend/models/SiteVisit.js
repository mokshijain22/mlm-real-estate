const mongoose = require('mongoose');

const siteVisitSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    mobile: { type: String, required: true },
    altMobile: { type: String, default: null },
    email: { type: String, default: null },
    address: { type: String, default: null },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // executive who logged the visit
    photo: { type: String, default: null }, // relative /storage path
    visitDate: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

siteVisitSchema.pre(/^find/, function (next) {
  if (this.getFilter().includeDeleted !== true) {
    this.where({ deletedAt: null });
  }
  next();
});

module.exports = mongoose.model('SiteVisit', siteVisitSchema);