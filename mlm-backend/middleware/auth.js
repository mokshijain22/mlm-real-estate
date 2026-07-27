const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verifies JWT from Authorization: Bearer <token> header,
 * loads the user (with role + rank populated) onto req.user.
 */
async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).populate('role').populate('rank');
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Account is not active.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

/**
 * Role-gate middleware. Usage: restrictTo('super_admin', 'sub_admin')
 */
function restrictTo(...allowedSlugs) {
  return (req, res, next) => {
    if (!req.user || !req.user.role || !allowedSlugs.includes(req.user.role.slug)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

/**
 * Module-permission gate for sub admins. super_admin always passes through.
 * sub_admin must have the given key in req.user.permissions.
 * Usage: requirePermission('kyc')
 */
function requirePermission(key) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    if (req.user.role.slug === 'super_admin') return next();
    if (req.user.role.slug === 'sub_admin' && (req.user.permissions || []).includes(key)) {
      return next();
    }
    return res.status(403).json({ message: 'You do not have access to this module. Contact your super admin.' });
  };
}

module.exports = { protect, restrictTo, requirePermission };
