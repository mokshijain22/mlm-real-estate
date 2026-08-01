const User = require('../../models/User');
const Role = require('../../models/Role');
const RankHistory = require('../../models/RankHistory');
const Booking = require('../../models/Booking');
const KycVerification = require('../../models/KycVerification');
const treeBuilderService = require('../../services/treeBuilderService');
const auditService = require('../../services/auditService');

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

    return res.json({ agent, referrals, assignedProjects, bankDetails });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch agent.', error: err.message });
  }
}

// GET /api/admin/agents/:id/tree
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

    return res.json({ agent, uplineChain, teamByLevel, treeData: await treeBuilderService.getHierarchicalTree(agent) });
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
    const { position, slab_per_sqft, gender, address } = req.body;

    const agent = await User.findById(req.params.id);
    if (!agent) return res.status(404).json({ message: 'Agent not found.' });

    if (position !== undefined) agent.position = position;
    if (slab_per_sqft !== undefined && slab_per_sqft !== '') agent.slabPerSqft = Number(slab_per_sqft);
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

module.exports = { index, show, tree, approve, deactivate, activate, rankHistory, updateReferralCode, updateDetails };