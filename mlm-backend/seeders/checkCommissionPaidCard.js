// TEST-ONLY — inspects exactly which WalletTransaction rows feed the
// "Commission Paid" (This Month at a Glance) dashboard card.
require('dotenv').config();
const connectDB = require('../config/db');
require('../models/User'); // registers the schema so .populate('agent') works
const WalletTransaction = require('../models/WalletTransaction');
async function run() {
  await connectDB();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const rows = await WalletTransaction.find({
    type: 'credit',
    category: { $in: ['emi_commission', 'deposit_commission'] },
    createdAt: { $gte: startOfMonth, $lt: startOfNextMonth },
  }).populate('agent', 'name');

  console.log('Matching rows for "Commission Paid" card:');
  let total = 0;
  rows.forEach((r) => {
    console.log(`  agent=${r.agent?.name} category=${r.category} amount=₹${r.amount} createdAt=${r.createdAt}`);
    total += r.amount;
  });
  console.log('Computed total:', total);
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });