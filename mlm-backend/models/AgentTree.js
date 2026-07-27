const mongoose = require('mongoose');

const agentTreeSchema = new mongoose.Schema(
  {
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    upline: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // direct referrer

    level1: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    level2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    level3: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    level4: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    level5: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    level6: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    level7: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AgentTree', agentTreeSchema);
