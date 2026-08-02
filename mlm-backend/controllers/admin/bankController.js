const Bank = require('../../models/Bank');

async function index(req, res) {
  const banks = await Bank.find({ isActive: true }).sort({ name: 1 });
  res.json({ data: banks });
}

async function store(req, res) {
  const { name, account_number, ifsc_code } = req.body;
  if (!name || !name.trim()) return res.status(422).json({ errors: { name: 'Bank name is required.' } });

  const bank = await Bank.create({
    name: name.trim(),
    accountNumber: account_number || null,
    ifscCode: ifsc_code || null,
    createdBy: req.user._id,
  });
  res.status(201).json({ data: bank });
}

module.exports = { index, store };