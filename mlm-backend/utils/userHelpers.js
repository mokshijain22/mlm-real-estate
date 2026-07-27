function isSuperAdmin(user) {
  return !!(user && user.role && user.role.slug === 'super_admin');
}

function isSubAdmin(user) {
  return !!(user && user.role && user.role.slug === 'sub_admin');
}

function isAgent(user) {
  return !!(user && user.role && user.role.slug === 'agent');
}

function photoUrl(user) {
  if (user && user.profilePhoto) {
    return `/storage/${user.profilePhoto}`;
  }
  return '/images/users/avatar-1.jpg';
}

const User = require('../models/User');

/**
 * Mirrors Laravel's getReferralLinkAttribute(): auto-generates and
 * persists a referral_code if the user doesn't already have one
 * (e.g. Sub Admin / seeded accounts not created via public registration).
 */
async function getReferralLink(user) {
  if (!user.referralCode) {
    let code;
    let exists = true;
    do {
      code = 'AG' + Math.random().toString(36).substring(2, 8).toUpperCase();
      exists = await User.findOne({ referralCode: code });
    } while (exists);

    user.referralCode = code;
    await User.updateOne({ _id: user._id }, { referralCode: code });
  }

  const base = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${base}/register?referral_code=${user.referralCode}`;
}

module.exports = { isSuperAdmin, isSubAdmin, isAgent, photoUrl, getReferralLink };
