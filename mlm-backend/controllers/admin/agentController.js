const User = require('../../models/User');
const Role = require('../../models/Role');
const RankHistory = require('../../models/RankHistory');
const Booking = require('../../models/Booking');
const KycVerification = require('../../models/KycVerification');
const treeBuilderService = require('../../services/treeBuilderService');
const Project = require('../../models/Project');
const auditService = require('../../services/auditService');
const bcrypt = require('bcryptjs');
const { buildTree } = require('../../services/treeBuilderService');
const { checkAndUpgradeRank } = require('../../services/rankService');

// GET /api/admin/agents?status=&kyc_status=&search=&page=
async function index(req, res) {
  try {
    const agentRole = await Role.findOne({ slug: 'agent' });
    if (!agentRole) return res.json({ data: [], meta: { page: 1, limit: 20, total: 0, lastPage: 1 } });

    const query = { role: agentRole._id };

    if (req.query.status) query.status = req.query.status;
    if (req.query.kyc_status !== undefined && req.query.kyc_status !== '') {
      query.isKycVerified = req.query.kyc_status === '1' || req.query.kyc_status === 'true';
    }
    if (req.query.search && req.query.search.trim()) {
      const re = new RegExp(req.query.search.trim(), 'i');
      query.$or = [
        { name: re },
        { email: re },
        { phone: re },
        { referralCode: re },
      ];
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const [agents, total] = await Promise.all([
      User.find(query)
        .populate('referredBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    return res.json({
      data: agents,
      meta: { page, limit, total, lastPage: Math.ceil(total / limit) },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch agents.', error: err.message });
  }
}
async function generateReferralCode() {
  const PREFIX = 'GK-';
  const START = 1001;
  const lastUser = await User.findOne({ referralCode: new RegExp(`^${PREFIX}\\d+$`) })
    .sort({ referralCode: -1 })
    .collation({ locale: 'en_US', numericOrdering: true });
  let nextNumber = START;
  if (lastUser) {
    const lastNumber = parseInt(lastUser.referralCode.replace(PREFIX, ''), 10);
    if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
  }
  return `${PREFIX}${nextNumber}`;
}

// POST /api/admin/agents
async function store(req, res) {
  try {
    const { name, email, phone, password, pan_or_aadhaar, referral_code, rank_id } = req.body;

    const errors = {};
    if (!name) errors.name = 'Name is required.';
    if (!email) errors.email = 'Email is required.';
    if (!phone || !/^\d{10,15}$/.test(phone)) errors.phone = 'Valid phone (10-15 digits) is required.';
    if (!password || password.length < 8) errors.password = 'Password must be at least 8 characters.';

    const isPan = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(String(pan_or_aadhaar || '').toUpperCase());
    const isAadhaar = /^\d{12}$/.test(String(pan_or_aadhaar || ''));
    if (!pan_or_aadhaar || (!isPan && !isAadhaar)) {
      errors.pan_or_aadhaar = 'Enter a valid PAN (ABCDE1234F) or Aadhaar number (12 digits).';
    }
    if (Object.keys(errors).length) return res.status(422).json({ errors });

    const [emailTaken, phoneTaken] = await Promise.all([
      User.findOne({ email }),
      User.findOne({ phone }),
    ]);
    if (emailTaken) return res.status(422).json({ errors: { email: 'Email already registered.' } });
    if (phoneTaken) return res.status(422).json({ errors: { phone: 'Phone already registered.' } });

    const idQuery = isPan
      ? { panNumber: String(pan_or_aadhaar).toUpperCase() }
      : { aadhaarNumber: String(pan_or_aadhaar) };
    const idTaken = await KycVerification.findOne(idQuery);
    if (idTaken) return res.status(422).json({ errors: { pan_or_aadhaar: (isPan ? 'PAN' : 'Aadhaar') + ' already registered.' } });

    let referrer = null;
    let mlmLevel = 1;
    const providedReferralCode = referral_code || '112233';
    referrer = await User.findOne({ referralCode: providedReferralCode });
    if (referrer) mlmLevel = (referrer.mlmLevel || 1) + 1;

    const agentRole = await Role.findOne({ slug: 'agent' });

    let targetRankId = rank_id || null;
    if (!targetRankId) {
      const defaultRank = await Rank.findOne({ abbreviation: 'B.EX' });
      if (defaultRank) targetRankId = defaultRank._id;
    }

    let newReferralCode;
    do {
      newReferralCode = await generateReferralCode();
      // eslint-disable-next-line no-await-in-loop
    } while (await User.findOne({ referralCode: newReferralCode }));

    const hashedPassword = await bcrypt.hash(password, 10);

    // Admin-created agents are trusted — active immediately, no approval wait.
    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: agentRole ? agentRole._id : null,
      rank: targetRankId,
      status: 'active',
      isKycVerified: false,
      referralCode: newReferralCode,
      referredBy: referrer ? referrer._id : null,
      mlmLevel,
    });

    await KycVerification.create({
      user: user._id,
      panNumber: isPan ? String(pan_or_aadhaar).toUpperCase() : null,
      aadhaarNumber: !isPan ? String(pan_or_aadhaar) : null,
      status: 'pending',
    });

    await buildTree(user);
    await checkAndUpgradeRank(user);

    await auditService.log(
      req,
      'agent.created',
      `Agent ${user.name} created directly by admin ${req.user.name}`,
      user
    );

    return res.status(201).json({ message: 'Executive created successfully.', data: user });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create executive.', error: err.message });
  }
}

// GET /api/admin/agents/:id
async function show(req, res) {
  try {
    const agent = await User.findById(req.params.id).populate('referredBy').populate('role');
    if (!agent) return res.status(404).json({ message: 'Agent not found.' });

    const referrals = await User.find({ referredBy: agent._id });

    // Assigned Projects — distinct projects where this agent has bookings
    const agentBookings = await Booking.find({ agent: agent._id }).populate('project', 'name location status');
    const projectMap = {};
    agentBookings.forEach((b) => {
      if (b.project) projectMap[b.project._id] = b.project;
    });
    const assignedProjects = Object.values(projectMap);

    // Bank / payout details from KYC
    const kyc = await KycVerification.findOne({ user: agent._id });
    const bankDetails = kyc
      ? {
          bankName: kyc.bankName,
          bankAccountNumber: kyc.bankAccountNumber,
          bankIfscCode: kyc.bankIfscCode,
        }
      : null;

    return res.json({ agent, referrals, assignedProjects, bankDetails, kyc });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch agent.', error: err.message });
  }
}

// GET /api/admin/agents/:id/tree
// GET /api/admin/tree/company?projectId=...
async function companyTree(req, res) {
  try {
    if (!req.query.projectId) {
      return res.status(422).json({ message: 'projectId is required.' });
    }
    const project = await Project.findById(req.query.projectId).select('commissionPool name');
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const treeData = await treeBuilderService.getCompanyTree(project.commissionPool, 7, project.name);
    return res.json({ project, treeData });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch company tree.', error: err.message });
  }
}

async function tree(req, res) {
  try {
    const agent = await User.findById(req.params.id).populate('referredBy').populate('role');
    if (!agent) return res.status(404).json({ message: 'Agent not found.' });

    const uplineChainMap = await treeBuilderService.getUplineChain(agent);
    const uplineIds = Object.values(uplineChainMap).filter(Boolean);
    const uplineUsersRaw = await User.find({ _id: { $in: uplineIds } });
    // preserve order Root -> ... -> Direct Upline (reverse of collected order)
    const uplineChain = uplineIds
      .map((id) => uplineUsersRaw.find((u) => u._id.toString() === id.toString()))
      .filter(Boolean)
      .reverse();

    const levelsData = await treeBuilderService.getDownlineByLevel(agent);
    const teamByLevel = {};

    for (const [level, userIds] of Object.entries(levelsData)) {
      const users = await User.find({ _id: { $in: userIds } });
      // attach referral counts (equivalent of withCount('referrals'))
      const usersWithCounts = await Promise.all(
        users.map(async (u) => {
          const referralsCount = await User.countDocuments({ referredBy: u._id });
          return { ...u.toObject(), referralsCount };
        })
      );
      teamByLevel[level] = usersWithCounts;
    }

    let poolPerSqft = null;
    if (req.query.projectId) {
      const project = await Project.findById(req.query.projectId).select('commissionPool');
      poolPerSqft = project ? project.commissionPool : null;
    }

    return res.json({
      agent,
      uplineChain,
      teamByLevel,
      treeData: await treeBuilderService.getHierarchicalTree(agent, 7, poolPerSqft),
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch agent tree.', error: err.message });
  }
}

// PATCH /api/admin/agents/:id/approve
async function approve(req, res) {
  try {
    const agent = await User.findById(req.params.id);
    if (!agent) return res.status(404).json({ message: 'Agent not found.' });

    agent.status = 'active';
    await agent.save();

    await auditService.log(req, 'agent.approved', `Agent ${agent.name} approved by ${req.user.name}`, agent);

    return res.json({ message: 'Agent approved successfully.', data: agent });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to approve agent.', error: err.message });
  }
}

// PATCH /api/admin/agents/:id/deactivate
async function deactivate(req, res) {
  try {
    const agent = await User.findById(req.params.id);
    if (!agent) return res.status(404).json({ message: 'Agent not found.' });

    agent.status = 'inactive';
    await agent.save();

    await auditService.log(req, 'agent.deactivated', `Agent ${agent.name} deactivated by ${req.user.name}`, agent);

    return res.json({ message: 'Agent deactivated successfully.', data: agent });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to deactivate agent.', error: err.message });
  }
}

// PATCH /api/admin/agents/:id/activate
async function activate(req, res) {
  try {
    const agent = await User.findById(req.params.id);
    if (!agent) return res.status(404).json({ message: 'Agent not found.' });

    agent.status = 'active';
    await agent.save();

    await auditService.log(req, 'agent.approved', `Agent ${agent.name} activated by ${req.user.name}`, agent);

    return res.json({ message: 'Agent activated successfully.', data: agent });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to activate agent.', error: err.message });
  }
}

// GET /api/admin/agents/:id/rank-history
async function rankHistory(req, res) {
  try {
    const agent = await User.findById(req.params.id).populate('rank');
    if (!agent) return res.status(404).json({ message: 'Agent not found.' });

    const rankHistoryList = await RankHistory.find({ agent: agent._id })
      .populate('oldRank')
      .populate('newRank')
      .sort({ upgradedAt: -1 });

    return res.json({ agent, rankHistory: rankHistoryList });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch rank history.', error: err.message });
  }
}

// PATCH /api/admin/agents/:id/referral-code
async function updateReferralCode(req, res) {
  try {
    const { referral_code } = req.body;
    if (!referral_code || !referral_code.trim()) {
      return res.status(422).json({ errors: { referral_code: 'Referral code is required.' } });
    }
    const code = referral_code.trim().toUpperCase();

    const agent = await User.findById(req.params.id);
    if (!agent) return res.status(404).json({ message: 'Agent not found.' });

    const dup = await User.findOne({ referralCode: code, _id: { $ne: agent._id } });
    if (dup) return res.status(422).json({ errors: { referral_code: 'This code is already in use by another user.' } });

    const oldCode = agent.referralCode;
    agent.referralCode = code;
    await agent.save();

    await auditService.log(req, 'agent.referral_code_updated', `Agent ${agent.name} code changed ${oldCode} -> ${code} by ${req.user.name}`, agent);

    return res.json({ message: 'Referral code updated successfully.', data: agent });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update referral code.', error: err.message });
  }
}

// PATCH /api/admin/agents/:id/details
async function updateDetails(req, res) {
  try {
    const { position, slab_per_sqft, gender, address, project_id } = req.body;

    const agent = await User.findById(req.params.id);
    if (!agent) return res.status(404).json({ message: 'Agent not found.' });

    if (position !== undefined) agent.position = position;
    if (slab_per_sqft !== undefined && slab_per_sqft !== '') {
      const newCap = Number(slab_per_sqft);

      let poolPerSqft = null;
      if (project_id) {
        const project = await Project.findById(project_id).select('commissionPool');
        if (project) poolPerSqft = project.commissionPool;
      }

      const maxAssignable = await treeBuilderService.getMaxAssignableCap(agent, poolPerSqft);
      if (maxAssignable != null && newCap > maxAssignable) {
        return res.status(422).json({
          errors: {
            slab_per_sqft: `Cap can't exceed ₹${maxAssignable}/sqft — that's the cap of ${agent.name}'s own upline. A downline's cap can't be higher than the cap of the person who referred them.`,
          },
        });
      }

      const childrenAgg = await User.aggregate([
        { $match: { referredBy: agent._id } },
        { $group: { _id: null, max: { $max: '$slabPerSqft' } } },
      ]);
      const alreadyAssignedToDownline = childrenAgg[0]?.max || 0;
      if (newCap < alreadyAssignedToDownline) {
        return res.status(422).json({
          errors: {
            slab_per_sqft: `Cap can't be lowered below ₹${alreadyAssignedToDownline}/sqft — that's the highest cap already assigned to ${agent.name}'s direct downline. Reduce that downline's cap first.`,
          },
        });
      }

      agent.slabPerSqft = newCap;
    }
    if (gender !== undefined && ['male', 'female', 'other', ''].includes(gender)) {
      agent.gender = gender || null;
    }
    if (address !== undefined) agent.address = address;

    await agent.save();

    await auditService.log(req, 'agent.details_updated', `Agent ${agent.name} details updated by ${req.user.name}`, agent);

    return res.json({ message: 'Agent details updated successfully.', data: agent });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update agent details.', error: err.message });
  }
}
module.exports = { index, show, tree, companyTree, approve, deactivate, activate, rankHistory, updateReferralCode, updateDetails, store };