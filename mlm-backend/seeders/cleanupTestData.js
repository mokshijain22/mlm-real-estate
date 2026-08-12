// TEST-ONLY — removes all withdrawal test records created during dashboard
// debugging (TEST-THIS-MONTH, TEST-LAST-MONTH, TEST-PENDING, TEST-E2E-WITHDRAWAL).
// Safe to re-run; only deletes docs matching these specific paymentReferences.
// Usage: node seeders/cleanupTestData.js
require('dotenv').config();
const connectDB = require('../config/db');
const WithdrawalRequest = require('../models/WithdrawalRequest');

const TEST_REFS = ['TEST-THIS-MONTH', 'TEST-LAST-MONTH', 'TEST-PENDING', 'TEST-E2E-WITHDRAWAL'];

async function run() {
  await connectDB();

  const found = await WithdrawalRequest.find({ paymentReference: { $in: TEST_REFS } });
  console.log(`Found ${found.length} test withdrawal record(s) to delete:`);
  found.forEach((w) => console.log(`  ref=${w.paymentReference} amount=₹${w.amount}`));

  const result = await WithdrawalRequest.deleteMany({ paymentReference: { $in: TEST_REFS } });
  console.log(`\nDeleted ${result.deletedCount} record(s).`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});