const Bank = require('../../models/Bank');

async function index(req, res) {
  const banks = await Bank.find({}).sort({ sortOrder: 1, name: 1 });
  res.json({ data: banks });
}

async function store(req, res) {
  const { name, account_holder_name, account_number, ifsc_code, branch, sort_order, is_active } = req.body;
  if (!name || !name.trim()) return res.status(422).json({ errors: { name: 'Bank name is required.' } });

  const bank = await Bank.create({
    name: name.trim(),
    accountHolderName: account_holder_name || null,
    accountNumber: account_number || null,
    ifscCode: ifsc_code || null,
    branch: branch || null,
    sortOrder: sort_order != null && sort_order !== '' ? Number(sort_order) : 0,
    isActive: is_active === undefined ? true : !!is_active,
    createdBy: req.user._id,
  });
  res.status(201).json({ data: bank });
}

async function update(req, res) {
  const { id } = req.params;
  const { name, account_holder_name, account_number, ifsc_code, branch, sort_order, is_active } = req.body;
  if (!name || !name.trim()) return res.status(422).json({ errors: { name: 'Bank name is required.' } });

  const bank = await Bank.findById(id);
  if (!bank) return res.status(404).json({ message: 'Bank not found.' });

  bank.name = name.trim();
  bank.accountHolderName = account_holder_name || null;
  bank.accountNumber = account_number || null;
  bank.ifscCode = ifsc_code || null;
  bank.branch = branch || null;
  bank.sortOrder = sort_order != null && sort_order !== '' ? Number(sort_order) : 0;
  if (is_active !== undefined) bank.isActive = !!is_active;
  await bank.save();

  res.json({ data: bank });
}

async function remove(req, res) {
  const { id } = req.params;
  const bank = await Bank.findById(id);
  if (!bank) return res.status(404).json({ message: 'Bank not found.' });
  await bank.deleteOne();
  res.json({ message: 'Bank removed.' });
}

module.exports = { index, store, update, remove };