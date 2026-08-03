const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, default: null },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    plotNumber: { type: String, default: null }, // free-text, plot may not be finalized yet
    location: { type: String, default: null },
    budget: { type: Number, default: null },
    source: {
      type: String,
      enum: ['website', 'referral', 'walk_in', 'call', 'social_media', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'site_visit_scheduled', 'site_visit_done', 'negotiation', 'converted', 'lost'],
      default: 'new',
    },
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, default: null },
    convertedBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

leadSchema.pre(/^find/, function (next) {
  if (this.getFilter().includeDeleted !== true) {
    this.where({ deletedAt: null });
  }
  next();
});

module.exports = mongoose.model('Lead', leadSchema);