const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, default: null },
    type: { type: String, default: 'string' },
    group: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
