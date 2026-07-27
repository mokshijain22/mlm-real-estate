const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const auditService = require('../services/auditService');

// GET /api/admin/profile  |  GET /api/agent/profile
async function show(req, res) {
  try {
    const user = await User.findById(req.user._id).select('-password').populate('rank').populate('role');
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch profile.', error: err.message });
  }
}

// PUT /api/admin/profile  |  PUT /api/agent/profile
// Expects multipart/form-data if profile_photo file is included (use profileUpload.single('profile_photo') in route),
// otherwise plain JSON body works too.
async function update(req, res) {
  try {
    const { name, phone } = req.body;

    const errors = {};
    if (!name || !String(name).trim()) {
      errors.name = 'Name is required.';
    }
    if (!phone || !/^\d{10,15}$/.test(String(phone))) {
      errors.phone = 'Phone is required and must be 10-15 digits.';
    } else {
      const existing = await User.findOne({ phone, _id: { $ne: req.user._id } });
      if (existing) errors.phone = 'This phone number is already taken.';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ errors });
    }

    const user = await User.findById(req.user._id);
    user.name = String(name).trim();
    user.phone = phone;

    if (req.file) {
      if (user.profilePhoto) {
        const oldPath = path.join(__dirname, '..', 'storage', 'public', user.profilePhoto);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      user.profilePhoto = `profiles/${req.file.filename}`;
    }

    await user.save();
    await auditService.log(req, 'profile.updated', `${user.name} updated their profile`);

    const safeUser = await User.findById(user._id).select('-password').populate('rank').populate('role');
    return res.json({ message: 'Profile updated successfully.', user: safeUser });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

// PUT /api/admin/profile/password  |  PUT /api/agent/profile/password
async function updatePassword(req, res) {
  try {
    const { current_password, password, password_confirmation } = req.body;

    const errors = {};
    if (!current_password) errors.current_password = 'Current password is required.';
    if (!password || password.length < 8) errors.password = 'Password is required and must be at least 8 characters.';
    if (password !== password_confirmation) errors.password = 'Password confirmation does not match.';

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ errors });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(422).json({ errors: { current_password: 'The provided password does not match your current password.' } });
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();
    await auditService.log(req, 'profile.password_changed', `${user.name} changed their password`);

    return res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

module.exports = { show, update, updatePassword };