const mongoose = require('mongoose');

const agentWalletSchema = new mongoose.Schema(
  {
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    bvBalance: { type: Number, default: 0 },
    pvBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AgentWallet', agentWalletSchema);
