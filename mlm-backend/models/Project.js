const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: null },
    location: { type: String, default: null },
    totalArea: { type: Number, required: true },
    status: { type: String, default: 'active' }, // mirrors App\Enums\ProjectStatus
    layoutSvg: { type: String, default: null },
    mapData: { type: mongoose.Schema.Types.Mixed, default: null }, // json

    projectType: { type: String, default: null }, // e.g. "Plotted Development (Society)"
    totalPlots: { type: Number, default: 0 },
    defaultRate: { type: Number, default: 0 }, // ₹/sqft — default selling rate for new plots
    defaultOwnerMinimum: { type: Number, default: 0 }, // ₹/sqft — floor price owner keeps
    commissionPool: { type: Number, default: 0 }, // auto: defaultRate - defaultOwnerMinimum (₹/sqft)

    facilities: [{ type: String }], // e.g. ["Clubhouse", "24x7 Security"]
    nearbyLandmarks: [
      {
        name: { type: String, required: true },
        distanceKm: { type: Number, required: true },
      },
    ],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: { type: Date, default: null }, // soft delete
  },
  { timestamps: true }
);

projectSchema.pre(/^find/, function (next) {
  if (this.getFilter().includeDeleted !== true) {
    this.where({ deletedAt: null });
  }
  next();
});

module.exports = mongoose.model('Project', projectSchema);
