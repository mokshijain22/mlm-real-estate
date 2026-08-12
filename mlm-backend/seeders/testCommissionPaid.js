// TEST-ONLY SCRIPT — for verifying the "Commission Paid" dashboard fix locally.
// Do NOT run this against the live/production database.
// Usage: node seeders/testCommissionPaid.js

require('dotenv').config();
const connectDB = require('../config/db');

const Role = require('../models/Role');
const User = require('../models/User');
const WithdrawalRequest = require('../models/WithdrawalRequest');

async function run() {
  await connectDB();

  const agentRole = await Role.findOne({ slug: 'agent' });
  if (!agentRole) {
    console.error('Agent role not found. Run `npm run seed` first.');
    process.exit(1);
  }

  let agent = await User.findOne({ email: 'agent@mlm.com' });
  if (!agent) {
    console.error('Test agent (agent@mlm.com) not found. Run `npm run seed` first.');
    process.exit(1);
  }

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 5);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);

  await WithdrawalRequest.deleteMany({ paymentReference: { $in: ['TEST-THIS-MONTH', 'TEST-LAST-MONTH', 'TEST-PENDING'] } });

  // Approved THIS month — should be counted
  await WithdrawalRequest.create({
    agent: agent._id,
    pointsType: 'BV',
    amount: 10000,
    tdsAmount: 500,
    netAmount: 9500,
    status: 'approved',
    requestedAt: startOfThisMonth,
    reviewedAt: startOfThisMonth,
    paymentReference: 'TEST-THIS-MONTH',
  });

  // Approved LAST month — should NOT be counted in this month's card
  await WithdrawalRequest.create({
    agent: agent._id,
    pointsType: 'PV',
    amount: 20000,
    tdsAmount: 1000,
    netAmount: 19000,
    status: 'approved',
    requestedAt: lastMonth,
    reviewedAt: lastMonth,
    paymentReference: 'TEST-LAST-MONTH',
  });

  // Still PENDING this month — should NOT be counted (not approved yet)
  await WithdrawalRequest.create({
    agent: agent._id,
    pointsType: 'BV',
    amount: 5000,
    tdsAmount: 250,
    netAmount: 4750,
    status: 'pending',
    requestedAt: startOfThisMonth,
    paymentReference: 'TEST-PENDING',
  });

  console.log('Test withdrawal data seeded.');
  console.log('Expected "Commission Paid" (this month) on dashboard: ₹9,500.00');
  console.log('(₹19,000 last-month and ₹4,750 pending should NOT be included)');
  process.exit(0);
}

run().catch((err) => {
  console.error('Test seeding failed:', err);
  process.exit(1);
});