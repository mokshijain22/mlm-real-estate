const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const Role = require('../../models/Role');

const VALID_PERMISSIONS = [
  'kyc', 'agents', 'referrals', 'projects', 'customers',
  'bookings', 'emis', 'reports', 'withdrawals', 'tickets',
];

function sanitizePermissions(input) {
  if (!Array.isArray(input)) return [];
  return input.filter((p) => VALID_PERMISSIONS.includes(p));
}

async function findSubAdminRoleId() {
  const role = await Role.findOne({ slug: 'sub_admin' });
  return role ? role._id : null;
}

// GET /api/admin/sub-admins
async function index(req, res) {
  try {
    const roleId = await findSubAdminRoleId();

    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const skip = (page - 1) * limit;

    const query = roleId ? { role: roleId } : { _id: null };

    const [subAdmins, total] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    return res.json({
      data: subAdmins,
      meta: { page, limit, total, lastPage: Math.ceil(total / limit) },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch sub admins.', error: err.message });
  }
}

// GET /api/admin/sub-admins/:id
async function show(req, res) {
  try {
    const roleId = await findSubAdminRoleId();
    const subAdmin = await User.findOne({ _id: req.params.id, role: roleId }).select('-password');

    if (!subAdmin) return res.status(404).json({ message: 'Sub admin not found.' });

    return res.json({ data: subAdmin });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch sub admin.', error: err.message });
  }
}

// POST /api/admin/sub-admins
async function store(req, res) {
  try {
    const { name, email, phone, password, password_confirmation, permissions } = req.body;

    const errors = {};
    if (!name || !name.trim()) errors.name = 'Name is required.';
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.email = 'A valid email is required.';
    if (!phone || !/^\d{10,15}$/.test(String(phone))) errors.phone = 'Phone is required and must be 10-15 digits.';
    if (!password || password.length < 8) errors.password = 'Password is required and must be at least 8 characters.';
    if (password !== password_confirmation) errors.password_confirmation = 'Password confirmation does not match.';

    if (Object.keys(errors).length === 0) {
      const [emailTaken, phoneTaken] = await Promise.all([
        User.findOne({ email }),
        User.findOne({ phone: String(phone) }),
      ]);
      if (emailTaken) errors.email = 'This email is already taken.';
      if (phoneTaken) errors.phone = 'This phone number is already taken.';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ errors });
    }

    const roleId = await findSubAdminRoleId();
    if (!roleId) return res.status(500).json({ message: 'sub_admin role not found. Please seed roles first.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const subAdmin = await User.create({
      name: name.trim(),
      email,
      phone: String(phone),
      password: hashedPassword,
      role: roleId,
      status: 'active',
      isKycVerified: true,
      permissions: sanitizePermissions(permissions),
    });

    const { password: _pw, ...safeSubAdmin } = subAdmin.toObject();

    return res.status(201).json({ message: 'Sub admin created successfully.', data: safeSubAdmin });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

// PATCH /api/admin/sub-admins/:id
async function update(req, res) {
  try {
    const roleId = await findSubAdminRoleId();
    const subAdmin = await User.findOne({ _id: req.params.id, role: roleId });
    if (!subAdmin) return res.status(404).json({ message: 'Sub admin not found.' });

    const { name, email, phone, password, password_confirmation, permissions } = req.body;

    const errors = {};
    if (!name || !name.trim()) errors.name = 'Name is required.';
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.email = 'A valid email is required.';
    if (!phone || !/^\d{10,15}$/.test(String(phone))) errors.phone = 'Phone is required and must be 10-15 digits.';
    if (password && password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (password && password !== password_confirmation) errors.password_confirmation = 'Password confirmation does not match.';

    if (Object.keys(errors).length === 0) {
      const [emailTaken, phoneTaken] = await Promise.all([
        User.findOne({ email, _id: { $ne: subAdmin._id } }),
        User.findOne({ phone: String(phone), _id: { $ne: subAdmin._id } }),
      ]);
      if (emailTaken) errors.email = 'This email is already taken.';
      if (phoneTaken) errors.phone = 'This phone number is already taken.';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ errors });
    }

    subAdmin.name = name.trim();
    subAdmin.email = email;
    subAdmin.phone = String(phone);
    subAdmin.permissions = sanitizePermissions(permissions);

    if (password) {
      subAdmin.password = await bcrypt.hash(password, 10);
    }

    await subAdmin.save();

    const { password: _pw, ...safeSubAdmin } = subAdmin.toObject();

    return res.json({ message: 'Sub admin updated successfully.', data: safeSubAdmin });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

// PATCH /api/admin/sub-admins/:id/toggle-status
async function toggleStatus(req, res) {
  try {
    const roleId = await findSubAdminRoleId();
    const subAdmin = await User.findOne({ _id: req.params.id, role: roleId });
    if (!subAdmin) return res.status(404).json({ message: 'Sub admin not found.' });

    subAdmin.status = subAdmin.status === 'active' ? 'inactive' : 'active';
    await subAdmin.save();

    const { password: _pw, ...safeSubAdmin } = subAdmin.toObject();

    return res.json({ message: 'Sub admin status updated successfully.', data: safeSubAdmin });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

module.exports = { index, show, store, update, toggleStatus };