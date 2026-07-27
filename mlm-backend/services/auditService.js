const AuditLog = require('../models/AuditLog');

/**
 * Log an action to the audit_logs collection.
 * @param {object} req - Express request (used for ip/user-agent/auth user)
 * @param {string} action - e.g. "kyc.approved"
 * @param {string} description - human readable description
 * @param {object|null} subject - the Mongoose document affected (needs ._id and constructor.modelName)
 */
async function log(req, action, description, subject = null) {
  const user = req.user || null; // set by auth middleware

  await AuditLog.create({
    user: user ? user._id : null,
    userName: user ? user.name : 'System',
    userRole: user && user.role ? user.role.slug : 'system',
    action,
    description,
    subjectType: subject ? subject.constructor.modelName : null,
    subjectId: subject ? subject._id : null,
    ipAddress: req.ip,
    userAgent: req.get ? req.get('User-Agent') : null,
  });
}

module.exports = { log };
