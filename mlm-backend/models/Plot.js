const mongoose = require('mongoose');

const plotSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    plotNumber: { type: String, required: true },
    totalArea: { type: Number, required: true },
    pricePerSqft: { type: Number, default: 0 },
    plcPercent: { type: Number, default: 0 }, // Preferential Location Charge, as % of (totalArea * pricePerSqft)    // Note: bv_per_sqft / pv_per_sqft were added then dropped from plots in Laravel migration history — intentionally omitted here
    status: { type: String, default: 'available' }, // mirrors App\Enums\PlotStatus (available/booked/sold)
    length: { type: Number, default: null },
    width: { type: Number, default: null },
    facing: { type: String, default: '' },
    zoneType: { type: String, default: '' },
    cornerPlot: { type: String, default: '' },
    boundaryN: { type: String, default: '' },
    boundaryS: { type: String, default: '' },
    boundaryE: { type: String, default: '' },
    boundaryW: { type: String, default: '' },
    mapCoordinates: { type: mongoose.Schema.Types.Mixed, default: null }, // json
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

plotSchema.pre(/^find/, function (next) {
  if (this.getFilter().includeDeleted !== true) {
    this.where({ deletedAt: null });
  }
  next();
});

module.exports = mongoose.model('Plot', plotSchema);
