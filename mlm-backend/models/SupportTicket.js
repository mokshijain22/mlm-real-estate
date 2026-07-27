const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    category: {
      type: String,
      enum: ['commission', 'kyc', 'booking', 'general'],
      default: 'general',
    },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    adminReply: { type: String, default: null },
    repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    repliedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
