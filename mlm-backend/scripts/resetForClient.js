// One-time destructive reset — wipes test/transactional data before handover
// to client. Keeps: Role, Rank (structural), the admin@mlm.com login, and
// business config (Bank, PricingRule, Setting). Only wipes agents, customers,
// projects, plots, bookings, and everything derived from them.
//
// Run with:  node scripts/resetForClient.js --confirm
// (without --confirm it only prints what WOULD be deleted, deletes nothing)

require('dotenv').config();
const connectDB = require('../config/db');

const User = require('../models/User');
const AgentTree = require('../models/AgentTree');
const AgentWallet = require('../models/AgentWallet');
const AuditLog = require('../models/AuditLog');
const Booking = require('../models/Booking');
const Customer = require('../models/Customer');
const Emi = require('../models/Emi');
const KycVerification = require('../models/KycVerification');
const Lead = require('../models/Lead');
const PaymentPlan = require('../models/PaymentPlan');
const Plot = require('../models/Plot');
const Project = require('../models/Project');
const RankHistory = require('../models/RankHistory');
const SiteVisit = require('../models/SiteVisit');
const SupportTicket = require('../models/SupportTicket');
const WalletTransaction = require('../models/WalletTransaction');
const WithdrawalRequest = require('../models/WithdrawalRequest');

const KEEP_ADMIN_EMAIL = 'admin@mlm.com';

async function run() {
  const confirmed = process.argv.includes('--confirm');

  await connectDB();

  const usersToDelete = await User.countDocuments({ email: { $ne: KEEP_ADMIN_EMAIL } });

  const plan = [
    { name: 'Users (all except admin@mlm.com)', model: User, filter: { email: { $ne: KEEP_ADMIN_EMAIL } }, count: usersToDelete },
    { name: 'AgentTree', model: AgentTree, filter: {} },
    { name: 'AgentWallet', model: AgentWallet, filter: {} },
    { name: 'AuditLog', model: AuditLog, filter: {} },
    { name: 'Booking', model: Booking, filter: {} },
    { name: 'Customer', model: Customer, filter: {} },
    { name: 'Emi', model: Emi, filter: {} },
    { name: 'KycVerification', model: KycVerification, filter: {} },
    { name: 'Lead', model: Lead, filter: {} },
    { name: 'PaymentPlan', model: PaymentPlan, filter: {} },
    { name: 'Plot', model: Plot, filter: {} },
    { name: 'Project', model: Project, filter: {} },
    { name: 'RankHistory', model: RankHistory, filter: {} },
    { name: 'SiteVisit', model: SiteVisit, filter: {} },
    { name: 'SupportTicket', model: SupportTicket, filter: {} },
    { name: 'WalletTransaction', model: WalletTransaction, filter: {} },
    { name: 'WithdrawalRequest', model: WithdrawalRequest, filter: {} },
  ];

  console.log(confirmed ? '=== RUNNING RESET (--confirm passed) ===' : '=== DRY RUN (pass --confirm to actually delete) ===');
  console.log(`Keeping: Role, Rank, Bank, PricingRule, Setting collections in full, and User "${KEEP_ADMIN_EMAIL}" only.\n`);

  for (const step of plan) {
    const count = step.count !== undefined ? step.count : await step.model.countDocuments(step.filter);
    if (confirmed) {
      const result = await step.model.deleteMany(step.filter);
      console.log(`Deleted ${result.deletedCount} from ${step.name}`);
    } else {
      console.log(`Would delete ${count} from ${step.name}`);
    }
  }

  if (confirmed) {
    console.log('\nReset complete. admin@mlm.com login, Banks, Pricing Rules, and Settings are intact.');
  } else {
    console.log('\nNothing was deleted. Re-run with --confirm to actually wipe the data:');
    console.log('  node scripts/resetForClient.js --confirm');
  }

  process.exit(0);
}

run().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});