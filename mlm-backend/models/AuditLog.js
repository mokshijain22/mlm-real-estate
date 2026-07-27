const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    userName: { type: String, default: null },
    userRole: { type: String, default: null },
    action: { type: String, required: true },
    description: { type: String, required: true },
    subjectType: { type: String, default: null },
    subjectId: { type: mongoose.Schema.Types.ObjectId, default: null },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
