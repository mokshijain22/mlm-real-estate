// Run this ONCE from inside mlm-backend/ with: node migrateDepositCommission.js
// Fixes historical WalletTransaction records: any 'emi_commission' credit that
// was actually for a Booking Deposit + Down Payment (not a real EMI) gets
// re-categorized to 'deposit_commission', matching the new split.
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const WalletTransaction = require('./models/WalletTransaction');

  // These were credited by processCombinedDepositCommission() with this exact
  // remark prefix — safe, specific match, won't touch real EMI transactions.
  const filter = {
    category: 'emi_commission',
    remark: { $regex: '^Booking Deposit \\+ Down Payment Commission' },
  };

  const matching = await WalletTransaction.find(filter).select('_id agent amount remark createdAt');

  console.log(`Found ${matching.length} transaction(s) to re-categorize:\n`);
  matching.forEach((t) => {
    console.log(`  ${t._id}  ₹${t.amount}  "${t.remark}"`);
  });

  if (matching.length === 0) {
    console.log('\nNothing to fix. Exiting.');
    process.exit(0);
  }

  const result = await WalletTransaction.updateMany(filter, { $set: { category: 'deposit_commission' } });

  console.log(`\nUpdated ${result.modifiedCount} transaction(s) to category 'deposit_commission'.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});