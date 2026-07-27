const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const User = require('../models/User');
const Role = require('../models/Role');
const Rank = require('../models/Rank');
const KycVerification = require('../models/KycVerification');

const { buildTree } = require('../services/treeBuilderService');
const { checkAndUpgradeRank } = require('../services/rankService');
const settingService = require('../services/settingService');
const auditService = require('../services/auditService');
const { isSuperAdmin, isSubAdmin, isAgent } = require('../utils/userHelpers');

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function generateReferralCode() {
  return 'AG' + crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { name, email, phone, pan_number, password, password_confirmation, referral_code, group, terms } =
      req.body;

    // --- validation (mirrors Laravel $request->validate) ---
    const errors = {};
    if (!name || typeof name !== 'string') errors.name = 'Name is required.';
    if (!email) errors.email = 'Email is required.';
    if (!phone || !/^\d{10,15}$/.test(phone)) errors.phone = 'Valid phone (10-15 digits) is required.';
    if (!pan_number || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(String(pan_number).toUpperCase())) {
      errors.pan_number = 'Valid PAN number is required.';
    }
    if (!password || password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (password !== password_confirmation) errors.password = 'Passwords do not match.';
    if (!terms) errors.terms = 'You must accept the terms.';

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ errors });
    }

    const [emailTaken, phoneTaken, panTaken] = await Promise.all([
      User.findOne({ email }),
      User.findOne({ phone }),
      KycVerification.findOne({ panNumber: String(pan_number).toUpperCase() }),
    ]);
    if (emailTaken) return res.status(422).json({ errors: { email: 'Email already registered.' } });
    if (phoneTaken) return res.status(422).json({ errors: { phone: 'Phone already registered.' } });
    if (panTaken) return res.status(422).json({ errors: { pan_number: 'PAN already registered.' } });

    // --- referral resolution ---
    let referrer = null;
    let mlmLevel = 1;

    // Track whether the user actually supplied a referral code themselves
    // (via URL or the form) — as opposed to us silently falling back to the
    // default top agent below. Only a genuine referral should skip approval.
    const referredExplicitly = !!referral_code;

    let providedReferralCode = referral_code || '112233'; // default to top agent

    referrer = await User.findOne({ referralCode: providedReferralCode }).populate('role').populate('rank');
    if (referrer) {
      mlmLevel = (referrer.mlmLevel || 1) + 1;
    }

    const agentRole = await Role.findOne({ slug: 'agent' });

    // --- unique referral code generation ---
    let newReferralCode;
    do {
      newReferralCode = generateReferralCode();
      // eslint-disable-next-line no-await-in-loop
    } while (await User.findOne({ referralCode: newReferralCode }));

    // --- approval-required setting ---
    // Agents who sign up through a genuine referral link/code are auto-activated —
    // no admin approval wait. The global "agent_approval_required" setting only
    // applies to direct/no-referral signups (root/default registrations).
    let status;
    if (referredExplicitly && referrer) {
      status = 'active';
    } else {
      const approvalRequired = await settingService.get('agent_approval_required', 0);
      status = approvalRequired ? 'pending' : 'active';
    }

    // --- group/rank referral placement (server-enforced, matches Laravel logic) ---
    let targetRankId = null;
    if (group && referrer) {
      const targetRank = await Rank.findOne({ abbreviation: group });
      if (targetRank) {
        if (isSuperAdmin(referrer) || isSubAdmin(referrer)) {
          targetRankId = targetRank._id;
        } else if (isAgent(referrer)) {
          const referrerSortOrder = referrer.rank ? referrer.rank.sortOrder : 0;
          if (targetRank.sortOrder <= referrerSortOrder) {
            targetRankId = targetRank._id;
          }
        }
      }
    }

    // default rank fallback (mirrors User::boot() creating hook -> B.EX)
    if (!targetRankId) {
      const defaultRank = await Rank.findOne({ abbreviation: 'B.EX' });
      if (defaultRank) targetRankId = defaultRank._id;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: agentRole ? agentRole._id : null,
      rank: targetRankId,
      status,
      isKycVerified: false,
      referralCode: newReferralCode,
      referredBy: referrer ? referrer._id : null,
      mlmLevel,
    });

    await KycVerification.create({
      user: user._id,
      panNumber: String(pan_number).toUpperCase(),
      status: 'pending',
    });

    await buildTree(user);

    // Trigger rank check to update total_team_size and rank for uplines
    await checkAndUpgradeRank(user);

    await auditService.log(
      req,
      'agent.registered',
      `New agent ${user.name} registered via referral of ${referrer ? referrer.name : 'direct'}`,
      user
    );

    if (status === 'pending') {
      return res.status(201).json({
        message: 'Registration successful. Your account is pending admin approval.',
        status: 'pending',
      });
    }

    // Auto-active flow: issue token immediately (mirrors auth()->login())
    const token = signToken(user._id);
    return res.status(201).json({
      message: 'Registration successful. Please complete your KYC.',
      token,
      user: { id: user._id, name: user.name, email: user.email, status: user.status },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Registration failed.', error: err.message });
  }
}

// GET /api/auth/validate-referral/:code
async function validateReferralCode(req, res) {
  const { code } = req.params;
  const user = await User.findOne({ referralCode: code }).populate('role');

  if (!user) {
    return res.json({ valid: false, message: 'Invalid or inactive referral code.' });
  }

  if (isSuperAdmin(user) || isSubAdmin(user)) {
    return res.json({ valid: true, agent_name: user.name });
  }

  if (isAgent(user) && user.status === 'active' && user.isKycVerified) {
    return res.json({ valid: true, agent_name: user.name });
  }

  return res.json({ valid: false, message: 'Invalid or inactive referral code.' });
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(422).json({ errors: { email: 'Email and password are required.' } });
    }

    const user = await User.findOne({ email }).populate('role').populate('rank');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ errors: { email: 'The provided credentials do not match our records.' } });
    }

    if (user.status !== 'active') {
      const statusMessage =
        user.status === 'pending'
          ? 'Your account is pending admin approval.'
          : 'Your account is inactive. Please contact support.';
      return res.status(403).json({ errors: { email: statusMessage } });
    }

    await auditService.log(
      { ...req, user }, // pass user in for logging even though not yet on req
      'auth.login',
      `User ${user.name} logged in`
    );

    const token = signToken(user._id);

    let redirectHint = '/';
    if (isSuperAdmin(user) || isSubAdmin(user)) redirectHint = '/admin/dashboard';
    else if (isAgent(user)) redirectHint = '/agent/dashboard';

    return res.json({
      token,
      redirect: redirectHint,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role?.slug,
        status: user.status,
        permissions: user.permissions || [],
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Login failed.', error: err.message });
  }
}

// GET /api/auth/profile
async function getProfile(req, res) {
  const user = await User.findById(req.user._id).populate('role').populate('rank');
  return res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      referralCode: user.referralCode,
      role: user.role?.slug,
      status: user.status,
      isKycVerified: user.isKycVerified,
      profilePhoto: user.profilePhoto,
      rank: user.rank ? { name: user.rank.name, abbreviation: user.rank.abbreviation } : null,
      createdAt: user.createdAt,
    },
  });
}

// PATCH /api/auth/profile
async function updateProfile(req, res) {
  const { name, phone, current_password, new_password } = req.body;

  const errors = {};
  if (!name) errors.name = 'Name is required.';
  if (phone && !/^\d{10,15}$/.test(phone)) errors.phone = 'Valid phone (10-15 digits) is required.';
  if (new_password && new_password.length < 8) errors.new_password = 'New password must be at least 8 characters.';
  if (Object.keys(errors).length) return res.status(422).json({ errors });

  const user = await User.findById(req.user._id);

  if (phone && phone !== user.phone) {
    const dup = await User.findOne({ phone, _id: { $ne: user._id } });
    if (dup) return res.status(422).json({ errors: { phone: 'Phone already in use.' } });
  }

  if (new_password) {
    if (!current_password) {
      return res.status(422).json({ errors: { current_password: 'Current password is required to set a new one.' } });
    }
    const matches = await bcrypt.compare(current_password, user.password);
    if (!matches) return res.status(422).json({ errors: { current_password: 'Current password is incorrect.' } });
    user.password = await bcrypt.hash(new_password, 10);
  }

  user.name = name;
  if (phone) user.phone = phone;
  await user.save();

  await auditService.log(req, 'profile.updated', `User ${user.name} updated their profile`);

  return res.json({ message: 'Profile updated successfully.' });
}

// POST /api/auth/logout
// Stateless JWT: real invalidation happens client-side (token discard) or via a
// token-blocklist if you add one later. We just audit-log the action here.
async function logout(req, res) {
  if (req.user) {
    await auditService.log(req, 'auth.logout', `User ${req.user.name} logged out`);
  }
  return res.json({ message: 'Logged out.' });
}

module.exports = { register, login, logout, validateReferralCode, getProfile, updateProfile };
