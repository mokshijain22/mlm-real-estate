require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');

const Role = require('../models/Role');
const Rank = require('../models/Rank');
const User = require('../models/User');
const Project = require('../models/Project');
const Plot = require('../models/Plot');
const Customer = require('../models/Customer');
const Booking = require('../models/Booking');
const Emi = require('../models/Emi');
const KycVerification = require('../models/KycVerification');
const SupportTicket = require('../models/SupportTicket');
const AuditLog = require('../models/AuditLog');
const WalletTransaction = require('../models/WalletTransaction');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const RankHistory = require('../models/RankHistory');
const AgentTree = require('../models/AgentTree');
const AgentWallet = require('../models/AgentWallet');
const Lead = require('../models/Lead');
const SiteVisit = require('../models/SiteVisit');
const PaymentPlan = require('../models/PaymentPlan');
const PricingRule = require('../models/PricingRule');

async function wipeTestData() {
  const models = [
    { name: 'Bookings', model: Booking },
    { name: 'EMIs', model: Emi },
    { name: 'Customers', model: Customer },
    { name: 'Plots', model: Plot },
    { name: 'Projects', model: Project },
    { name: 'KYC Verifications', model: KycVerification },
    { name: 'Support Tickets', model: SupportTicket },
    { name: 'Audit Logs', model: AuditLog },
    { name: 'Wallet Transactions', model: WalletTransaction },
    { name: 'Withdrawal Requests', model: WithdrawalRequest },
    { name: 'Rank History', model: RankHistory },
    { name: 'Agent Tree', model: AgentTree },
    { name: 'Agent Wallets', model: AgentWallet },
    { name: 'Leads', model: Lead },
    { name: 'Site Visits', model: SiteVisit },
    { name: 'Payment Plans', model: PaymentPlan },
    { name: 'Pricing Rules', model: PricingRule },
    { name: 'Users (all agents/sub-admins/admins)', model: User },
  ];

  for (const { name, model } of models) {
    const result = await model.deleteMany({});
    console.log(`Cleared ${name}: ${result.deletedCount} records removed.`);
  }
}

async function reseedFreshAdmin() {
  // Roles & Ranks are kept as-is (not test data) — just make sure super_admin role exists
  const superAdminRole = await Role.findOne({ slug: 'super_admin' });
  if (!superAdminRole) {
    console.log('WARNING: super_admin role not found — run the normal seed.js first, then this script.');
    return;
  }

  const hashed = await bcrypt.hash('12345678', 10);
  await User.create({
    name: 'Super Admin',
    email: 'admin@mlm.com',
    password: hashed,
    role: superAdminRole._id,
    status: 'active',
    isKycVerified: true,
    emailVerifiedAt: new Date(),
    referralCode: '112233',
  });
  console.log('\nFresh Super Admin created: admin@mlm.com / 12345678');
  console.log('IMPORTANT: Client should change this password immediately after first login.');
}

async function run() {
  console.log('=== PRODUCTION RESET — this will permanently delete ALL test data ===');
  await connectDB();
  await wipeTestData();
  await reseedFreshAdmin();
  console.log('\nDone. Roles, Ranks and Settings were left untouched (they are system config, not test data).');
  process.exit(0);
}

run().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});