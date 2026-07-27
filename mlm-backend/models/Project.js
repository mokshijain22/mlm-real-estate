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
