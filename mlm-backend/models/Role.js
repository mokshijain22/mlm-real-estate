const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Role', roleSchema);
