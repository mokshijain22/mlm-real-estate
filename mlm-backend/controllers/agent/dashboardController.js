const KycVerification = require('../../models/KycVerification');
const { getDashboardData } = require('../../services/agentDashboardService');

// GET /api/agent/dashboard
async function index(req, res) {
  const agent = req.user; // populated with role + rank by protect middleware

  const kyc = await KycVerification.findOne({ user: agent._id });
  const kycStatus = kyc ? kyc.status : null;

  // Mirrors Laravel: if KYC not approved, return minimal dashboard with alert
  if (kycStatus !== 'approved') {
    return res.json({
      title: 'Agent Dashboard',
      kycStatus,
      rejectionReason: kyc ? kyc.rejectionReason : null,
      minimal: true,
    });
  }

  const dashboardData = await getDashboardData(agent);

  return res.json({
    title: 'Agent Dashboard',
    kycStatus,
    minimal: false,
    ...dashboardData,
  });
}

module.exports = { index };