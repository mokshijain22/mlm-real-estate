const Rank = require('../../models/Rank');
const User = require('../../models/User');
const { getReferralLink } = require('../../utils/userHelpers');

// GET /api/admin/referrals
async function index(req, res) {
  try {
    const admin = req.user;

    // Admin's own personal referral link (auto-generates a referral_code if missing)
    const personalReferralLink = await getReferralLink(admin);

    // All rank/group referral links, each combining the admin's personal
    // referral code with the target group, e.g. .../register?referral_code=AG12AB34&group=S.D
    const ranks = await Rank.find().sort({ sortOrder: 1 });

    const ranksWithCount = await Promise.all(
      ranks.map(async (rank) => {
        const agentsCount = await User.countDocuments({ rank: rank._id });
        return {
          ...rank.toObject(),
          agentsCount,
          groupReferralLink: `${personalReferralLink}&group=${rank.abbreviation}`,
        };
      })
    );

    return res.json({
      admin: { _id: admin._id, name: admin.name, email: admin.email },
      personalReferralLink,
      ranks: ranksWithCount,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch referral links.', error: err.message });
  }
}

module.exports = { index };