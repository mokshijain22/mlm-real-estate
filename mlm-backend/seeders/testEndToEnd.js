// TEST-ONLY SCRIPT — full end-to-end test: tree + project + booking with
// multiple down payments + EMI payments + commission triggers + withdrawal.
// Do NOT run this against the live/production database.
// Usage: node seeders/testEndToEnd.js
// PRE-REQ: run `npm run seed` first (creates roles/ranks/admin).
// SAFETY: run only after MONGO_URI in .env points to mlm_test (or similar).

require('dotenv').config();
const connectDB = require('../config/db');

const Role = require('../models/Role');
const Rank = require('../models/Rank');
const User = require('../models/User');
const Project = require('../models/Project');
const Plot = require('../models/Plot');
const Customer = require('../models/Customer');
const Booking = require('../models/Booking');
const Emi = require('../models/Emi');
const WalletTransaction = require('../models/WalletTransaction');
const WithdrawalRequest = require('../models/WithdrawalRequest');

const bookingService = require('../services/bookingService');
const commissionService = require('../services/commissionService');

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function upsertAgent({ email, name, referredBy, rankAbbr, slabPerSqft }) {
  const agentRole = await Role.findOne({ slug: 'agent' });
  const rank = await Rank.findOne({ abbreviation: rankAbbr });
  const bcrypt = require('bcryptjs');
  const hashed = await bcrypt.hash('password', 10);

  return User.findOneAndUpdate(
    { email },
    {
      name,
      email,
      password: hashed,
      role: agentRole._id,
      status: 'active',
      isKycVerified: true,
      referredBy: referredBy || null,
      referralCode: email.split('@')[0].toUpperCase(),
      rank: rank ? rank._id : null,
      slabPerSqft,
    },
    { upsert: true, new: true }
  );
}

async function run() {
  await connectDB();

  const superAdmin = await User.findOne({ email: 'admin@mlm.com' });
  if (!superAdmin) {
    console.error('Run `npm run seed` first (super admin not found).');
    process.exit(1);
  }

  console.log('--- Cleaning up any previous E2E test data ---');
  const oldCustomer = await Customer.findOne({ customerCode: 'TEST-E2E-CUST' });
  if (oldCustomer) {
    const oldBookings = await Booking.find({ customer: oldCustomer._id });
    for (const b of oldBookings) {
      await Emi.deleteMany({ booking: b._id });
      await WalletTransaction.deleteMany({ booking: b._id });
    }
    await Booking.deleteMany({ customer: oldCustomer._id });
    await Customer.deleteOne({ _id: oldCustomer._id });
  }
  await Plot.deleteMany({ plotNumber: 'E2E-PLOT-01' });
  await Project.deleteMany({ name: 'E2E Test Township' });

  console.log('--- Building 3-level executive tree ---');
  // Top of chain — highest rank, holds the biggest slab
  const topExec = await upsertAgent({
    email: 'e2e.top@mlm.com',
    name: 'E2E Top Executive',
    referredBy: null,
    rankAbbr: 'S.D',
    slabPerSqft: 200,
  });

  const midExec = await upsertAgent({
    email: 'e2e.mid@mlm.com',
    name: 'E2E Mid Executive',
    referredBy: topExec._id,
    rankAbbr: 'T.L',
    slabPerSqft: 120,
  });

  const sellingAgent = await upsertAgent({
    email: 'e2e.seller@mlm.com',
    name: 'E2E Selling Agent',
    referredBy: midExec._id,
    rankAbbr: 'B.EX',
    slabPerSqft: 60,
  });

  console.log('Tree: %s -> %s -> %s', topExec.name, midExec.name, sellingAgent.name);

  console.log('--- Creating Project + Plot ---');
  const defaultRate = 3000; // ₹/sqft selling rate
  const defaultOwnerMinimum = 2500; // ₹/sqft owner floor
  const commissionPool = defaultRate - defaultOwnerMinimum; // = 500 ₹/sqft

  const project = await Project.create({
    name: 'E2E Test Township',
    description: 'End-to-end test project (safe to delete)',
    location: 'Test Location',
    totalArea: 100000,
    status: 'active',
    projectType: 'Plotted Development (Society)',
    totalPlots: 1,
    defaultRate,
    defaultOwnerMinimum,
    commissionPool,
    createdBy: superAdmin._id,
  });

  const plot = await Plot.create({
    project: project._id,
    plotNumber: 'E2E-PLOT-01',
    totalArea: 1000,
    pricePerSqft: defaultRate,
    plcPercent: 5,
    status: 'available',
    createdBy: superAdmin._id,
  });

  console.log('--- Creating Customer ---');
  const customer = await Customer.create({
    customerCode: 'TEST-E2E-CUST',
    name: 'E2E Test Customer',
    phone: '9999900001',
    email: 'e2e.customer@example.com',
    status: 'active',
    addedBy: superAdmin._id,
  });

  console.log('--- Creating Booking (token + DP + 2 additional down payments + 3 EMIs) ---');
  const booking = await bookingService.createBooking(
    {
      customer_id: customer._id,
      plot_id: plot._id,
      agent_id: sellingAgent._id,
      plot_area: 1000,
      price_per_sqft: defaultRate,
      plc_percent: 5,
      booking_amount: 100000, // token
      token_collected: true,
      down_payment_amount: 300000,
      down_payment_due_date: addDays(new Date(), 30),
      additional_down_payments: [
        { amount: 200000, due_date: addDays(new Date(), 60) },
        { amount: 150000, due_date: addDays(new Date(), 90) },
      ],
      emi_months: 3,
      payment_mode: 'bank_transfer',
      payment_date: new Date(),
      commission_cap_per_sqft: 0, // uncapped seller
      upline_commission_caps_per_sqft: [],
    },
    superAdmin // acting as admin -> auto-approved, EMIs generated immediately
  );

  console.log('Booking created: %s (status: %s)', booking.bookingNumber, booking.approvalStatus);

  console.log('--- Paying every EMI/DP milestone in order + triggering commission ---');
  const emis = await Emi.find({ booking: booking._id }).sort({ emiNumber: 1 });

  for (const emi of emis) {
    if (emi.emiNumber === 0 && emi.status === 'paid') {
      // token already auto-marked paid by createBooking (token_collected: true)
      continue;
    }
    emi.status = 'paid';
    emi.paidDate = new Date();
    emi.paymentMode = 'bank_transfer';
    emi.paymentReference = `E2E-EMI-${emi.emiNumber}`;
    await emi.save();
    await commissionService.processEmiCommission(emi);
    console.log('  Paid + processed commission for emiNumber %d (₹%d)', emi.emiNumber, emi.amount);
  }

  console.log('--- Wallet summary ---');
  const wallets = await WalletTransaction.find({ booking: booking._id }).populate('agent', 'name email');
  let totalCredited = 0;
  for (const w of wallets) {
    console.log(
      '  %s | %s | %s | ₹%d | %s',
      w.agent.name,
      w.category,
      w.pointsType,
      w.amount,
      w.type
    );
    if (w.type === 'credit') totalCredited += w.amount;
  }
  console.log('Total credited across all agents: ₹%d', totalCredited);
  console.log('Booking.companyRatePerSqft (snapshotted): ₹%d/sqft', booking.companyRatePerSqft);

  console.log('--- Creating a withdrawal request for the selling agent ---');
  await WithdrawalRequest.deleteMany({ paymentReference: 'TEST-E2E-WITHDRAWAL' });
  const sellerCredits = wallets.filter(
    (w) => w.agent._id.toString() === sellingAgent._id.toString() && w.type === 'credit'
  );
  const sellerTotal = sellerCredits.reduce((sum, w) => sum + w.amount, 0);
  const withdrawAmount = Math.min(sellerTotal, 10000) || 1000;
  const tds = Math.round(withdrawAmount * 0.05);

  await WithdrawalRequest.create({
    agent: sellingAgent._id,
    pointsType: 'BV',
    amount: withdrawAmount,
    tdsAmount: tds,
    netAmount: withdrawAmount - tds,
    status: 'approved',
    requestedAt: new Date(),
    reviewedAt: new Date(),
    reviewedBy: superAdmin._id,
    paymentReference: 'TEST-E2E-WITHDRAWAL',
  });

  console.log('Withdrawal created for %s: ₹%d (net ₹%d after TDS)', sellingAgent.name, withdrawAmount, withdrawAmount - tds);

  console.log('\n=== DONE ===');
  console.log('Login as agent@... e2e.seller@mlm.com / password to view as the selling agent.');
  console.log('Booking number: %s | Customer: %s | Project: %s', booking.bookingNumber, customer.name, project.name);
  console.log('Check: Executive Tree, Booking Detail, Commission Report, EMI Collections, Dashboard "Commission Paid".');

  process.exit(0);
}

run().catch((err) => {
  console.error('E2E seeding failed:', err);
  process.exit(1);
});