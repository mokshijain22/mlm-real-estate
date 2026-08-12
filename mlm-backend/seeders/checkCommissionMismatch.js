// TEST-ONLY — checks for the Generated-vs-Received mismatch causing the
// negative "Total Commission Pending" on the dashboard.
// Usage: node seeders/checkCommissionMismatch.js
require('dotenv').config();
const connectDB = require('../config/db');
const WalletTransaction = require('../models/WalletTransaction');
const WithdrawalRequest = require('../models/WithdrawalRequest');

async function run() {
  await connectDB();

  const creditCount = await WalletTransaction.countDocuments({ type: 'credit' });
  const creditTotal = await WalletTransaction.aggregate([
    { $match: { type: 'credit', category: { $in: ['emi_commission', 'deposit_commission', 'rank_difference'] } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const approvedWithdrawals = await WithdrawalRequest.find({ status: 'approved' });
  const withdrawalTotal = approvedWithdrawals.reduce((sum, w) => sum + w.netAmount, 0);

  console.log('WalletTransaction credit rows found:', creditCount);
  console.log('Total Commission Generated (from wallet credits): ₹', creditTotal[0]?.total || 0);
  console.log('Total Commission Received (from approved withdrawals): ₹', withdrawalTotal);
  console.log('\nApproved withdrawal records:');
  approvedWithdrawals.forEach((w) =>
    console.log(`  ref=${w.paymentReference || '(none)'}  amount=₹${w.amount}  net=₹${w.netAmount}  agent=${w.agent}`)
  );

  process.exit(0);
}

run().catch((err) => {
  console.error('Check failed:', err);
  process.exit(1);
});