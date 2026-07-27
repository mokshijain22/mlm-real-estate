const KycVerification = require('../../models/KycVerification');
const User = require('../../models/User');
const auditService = require('../../services/auditService');

// GET /api/agent/kyc
async function index(req, res) {
  const user = req.user;
  const kyc = await KycVerification.findOne({ user: user._id });

  if (kyc) {
    if (kyc.status === 'approved') {
      return res.json({ redirect: 'dashboard', message: 'Your KYC is already verified.' });
    }
    // Only redirect to status if actually submitted (aadhaarFront as proxy for submission)
    if (kyc.status === 'pending' && kyc.aadhaarFront) {
      return res.json({ redirect: 'status' });
    }
    // Rejected or incomplete — show the form pre-filled
    return res.json({ kyc });
  }

  return res.json({ kyc: null });
}

// POST /api/agent/kyc
async function store(req, res) {
  const user = req.user;
  const kyc = await KycVerification.findOne({ user: user._id });

  const { aadhaar_number, pan_number, bank_account_number, bank_ifsc_code, bank_name } = req.body;
  const files = req.files || {};

  const errors = {};
  if (!aadhaar_number || !/^\d{12}$/.test(aadhaar_number)) errors.aadhaar_number = 'Aadhaar number must be 12 digits.';
  if (!pan_number || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number)) errors.pan_number = 'The PAN number format is invalid (e.g. ABCDE1234F).';
  if (!bank_account_number) errors.bank_account_number = 'Bank account number is required.';
  if (!bank_ifsc_code || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank_ifsc_code)) errors.bank_ifsc_code = 'Invalid IFSC code format.';
  if (!bank_name) errors.bank_name = 'Bank name is required.';

  // File requirements: required unless already uploaded previously (matches Laravel)
  const needsFile = (field) => !(kyc && kyc[field]);
  if (needsFile('aadhaarFront') && !files.aadhaar_front) errors.aadhaar_front = 'Aadhaar front image is required.';
  if (needsFile('aadhaarBack') && !files.aadhaar_back) errors.aadhaar_back = 'Aadhaar back image is required.';
  if (needsFile('panDocument') && !files.pan_document) errors.pan_document = 'PAN document is required.';
  if (needsFile('bankProof') && !files.bank_proof) errors.bank_proof = 'Bank proof is required.';

  if (Object.keys(errors).length) return res.status(422).json({ errors });

  // Uniqueness check (ignoring this user's own existing record)
  const dupAadhaar = await KycVerification.findOne({ aadhaarNumber: aadhaar_number, _id: { $ne: kyc ? kyc._id : null } });
  if (dupAadhaar) return res.status(422).json({ errors: { aadhaar_number: 'This Aadhaar number is already registered.' } });

  const dupPan = await KycVerification.findOne({ panNumber: pan_number.toUpperCase(), _id: { $ne: kyc ? kyc._id : null } });
  if (dupPan) return res.status(422).json({ errors: { pan_number: 'This PAN number is already registered.' } });

  const data = {
    user: user._id,
    aadhaarNumber: aadhaar_number,
    panNumber: pan_number.toUpperCase(),
    bankAccountNumber: bank_account_number,
    bankIfscCode: bank_ifsc_code.toUpperCase(),
    bankName: bank_name,
    status: 'pending',
    rejectionReason: null,
  };

  if (files.aadhaar_front) data.aadhaarFront = `kyc/${user._id}/${files.aadhaar_front[0].filename}`;
  if (files.aadhaar_back) data.aadhaarBack = `kyc/${user._id}/${files.aadhaar_back[0].filename}`;
  if (files.pan_document) data.panDocument = `kyc/${user._id}/${files.pan_document[0].filename}`;
  if (files.bank_proof) data.bankProof = `kyc/${user._id}/${files.bank_proof[0].filename}`;

  const updatedKyc = await KycVerification.findOneAndUpdate(
    { user: user._id },
    data,
    { upsert: true, new: true }
  );

  await User.updateOne({ _id: user._id }, { isKycVerified: false });

  await auditService.log(req, 'kyc.submitted', `Agent ${user.name} submitted KYC documents`, updatedKyc);

  return res.json({ message: 'KYC details submitted successfully and are under review.', data: updatedKyc });
}

// GET /api/agent/kyc/status
async function status(req, res) {
  const kyc = await KycVerification.findOne({ user: req.user._id });

  if (!kyc) return res.json({ redirect: 'kyc.index' });
  if (kyc.status === 'approved') return res.json({ redirect: 'dashboard' });

  return res.json({ kyc });
}

module.exports = { index, store, status };