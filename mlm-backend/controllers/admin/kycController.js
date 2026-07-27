const KycVerification = require('../../models/KycVerification');
const User = require('../../models/User');
const treeBuilderService = require('../../services/treeBuilderService');
const rankService = require('../../services/rankService');
const auditService = require('../../services/auditService');

// GET /api/admin/kyc?status=&page=
async function index(req, res) {
  try {
    const status = req.query.status || 'all';
    const query = {};
    if (status !== 'all') query.status = status;

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const [kycs, total] = await Promise.all([
      KycVerification.find(query)
        .populate({
          path: 'user',
          select: 'name email phone status referredBy',
          populate: { path: 'referredBy', select: 'name' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      KycVerification.countDocuments(query),
    ]);

    return res.json({
      data: kycs,
      meta: { page, limit, total, lastPage: Math.ceil(total / limit) },
      status,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch KYC applications.', error: err.message });
  }
}

// GET /api/admin/kyc/:id
async function show(req, res) {
  try {
    const kyc = await KycVerification.findById(req.params.id).populate('user');
    if (!kyc) return res.status(404).json({ message: 'KYC record not found.' });

    return res.json({ kyc });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch KYC record.', error: err.message });
  }
}

// PATCH /api/admin/kyc/:id/approve
async function approve(req, res) {
  try {
    const kyc = await KycVerification.findById(req.params.id);
    if (!kyc) return res.status(404).json({ message: 'KYC record not found.' });

    kyc.status = 'approved';
    kyc.reviewedBy = req.user._id;
    kyc.reviewedAt = new Date();
    await kyc.save();

    const user = await User.findById(kyc.user);
    if (!user) return res.status(404).json({ message: 'Associated user not found.' });

    user.isKycVerified = true;
    await user.save();

    // Recalculate team size / group sales for the entire upline chain
    const uplineChain = await treeBuilderService.getUplineChain(user);
    for (const uplineId of Object.values(uplineChain)) {
      const uplineAgent = await User.findById(uplineId);
      if (uplineAgent) {
        await rankService.checkAndUpgradeRank(uplineAgent);
      }
    }

    // Also update the newly approved agent's own stats
    await rankService.checkAndUpgradeRank(user);

    await auditService.log(
      req,
      'kyc.approved',
      `KYC approved for agent ${user.name} by ${req.user.name}`,
      kyc
    );

    return res.json({ message: 'KYC application approved successfully.', data: kyc });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to approve KYC.', error: err.message });
  }
}

// PATCH /api/admin/kyc/:id/reject
async function reject(req, res) {
  try {
    const { rejection_reason } = req.body;

    if (!rejection_reason || rejection_reason.trim().length < 5) {
      return res.status(422).json({ errors: { rejection_reason: 'Rejection reason must be at least 5 characters.' } });
    }

    const kyc = await KycVerification.findById(req.params.id);
    if (!kyc) return res.status(404).json({ message: 'KYC record not found.' });

    kyc.status = 'rejected';
    kyc.rejectionReason = rejection_reason;
    kyc.reviewedBy = req.user._id;
    kyc.reviewedAt = new Date();
    await kyc.save();

    const user = await User.findById(kyc.user);
    if (user) {
      user.isKycVerified = false;
      await user.save();
    }

    await auditService.log(
      req,
      'kyc.rejected',
      `KYC rejected for agent ${user ? user.name : kyc.user}. Reason: ${rejection_reason}`,
      kyc
    );

    return res.json({ message: 'KYC application rejected.', data: kyc });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to reject KYC.', error: err.message });
  }
}

module.exports = { index, show, approve, reject };