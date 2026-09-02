// Read-only — prints every wallet transaction for one agent (by referral
// code) plus the running balance after each one, so we can see exactly
// where the stored bvBalance/pvBalance stops matching the sum of
// transactions (e.g. GK-1004 showing 90001 instead of 90000).
//
// Usage: node seeders/traceWalletBalance.js GK-1004
require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const AgentWallet = require('../models/AgentWallet');
const WalletTransaction = require('../models/WalletTransaction');
// Required so mongoose has these schemas registered before we .populate() them below.
require('../models/Booking');
require('../models/Emi');

async function run() {
  await connectDB();

  const referralCode = process.argv[2];
  if (!referralCode) {
    console.log('Usage: node seeders/traceWalletBalance.js <referralCode>');
    process.exit(1);
  }

  const agent = await User.findOne({ referralCode });
  if (!agent) {
    console.log(`No agent found with referralCode ${referralCode}`);
    process.exit(1);
  }

  const wallet = await AgentWallet.findOne({ agent: agent._id });
  console.log(`\n=== ${agent.name} (${referralCode}) ===`);
  console.log('Stored bvBalance:', wallet?.bvBalance, '| Stored pvBalance:', wallet?.pvBalance);

  const txns = await WalletTransaction.find({ agent: agent._id })
    .sort({ createdAt: 1 })
    .populate('booking', 'bookingNumber')
    .populate('emi', 'emiNumber');

  let runningBv = 0;
  let runningPv = 0;

  console.log('\n--- Transactions (chronological) ---');
  for (const t of txns) {
    const signedAmount = t.type === 'credit' ? Number(t.amount) : -Number(t.amount);
    if (t.pointsType === 'BV') runningBv += signedAmount;
    else runningPv += signedAmount;

    console.log(
      `[${t.createdAt.toISOString().slice(0, 10)}] ${t.type.toUpperCase()} ${t.pointsType} ${signedAmount.toFixed(2)}` +
        ` | category=${t.category}` +
        ` | booking=${t.booking?.bookingNumber || '-'}` +
        ` | emi=${t.emi?.emiNumber ?? '-'}` +
        ` | remark="${t.remark || ''}"` +
        ` | runningBv=${runningBv.toFixed(2)} runningPv=${runningPv.toFixed(2)}`
    );
  }

  console.log('\n--- Summary ---');
  console.log('Sum of BV transactions:', runningBv.toFixed(2), '| Stored bvBalance:', wallet?.bvBalance);
  console.log('Sum of PV transactions:', runningPv.toFixed(2), '| Stored pvBalance:', wallet?.pvBalance);
  console.log('BV drift:', (Number(wallet?.bvBalance || 0) - runningBv).toFixed(2));
  console.log('PV drift:', (Number(wallet?.pvBalance || 0) - runningPv).toFixed(2));

  process.exit(0);
}

run().catch((err) => {
  console.error('Trace failed:', err);
  process.exit(1);
});