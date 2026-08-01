require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');

const Role = require('../models/Role');
const Rank = require('../models/Rank');
const Setting = require('../models/Setting');
const User = require('../models/User');

async function seedRoles() {
  const roles = [
    { name: 'Super Admin', slug: 'super_admin', description: 'System administrator with full access' },
    { name: 'Sub Admin', slug: 'sub_admin', description: 'Assists the super admin with limited access' },
    { name: 'Agent', slug: 'agent', description: 'Agent who manages MLM activities' },
  ];

  for (const role of roles) {
    await Role.findOneAndUpdate({ slug: role.slug }, role, { upsert: true, new: true });
  }
  console.log('Roles seeded.');
}

async function seedRanks() {
  const ranks = [
    { name: 'Business Executive', abbreviation: 'B.EX', minGroupSales: 0, minTeamSize: 0, bvPoints: 50, pvPoints: 50, sortOrder: 1 },
    { name: 'Senior Business Executive', abbreviation: 'S.BEX', minGroupSales: 75, minTeamSize: 10, bvPoints: 75, pvPoints: 75, sortOrder: 2 },
    { name: 'Team Leader', abbreviation: 'T.L', minGroupSales: 100, minTeamSize: 20, bvPoints: 100, pvPoints: 100, sortOrder: 3 },
    { name: 'Senior Team Leader', abbreviation: 'ST.L', minGroupSales: 125, minTeamSize: 40, bvPoints: 125, pvPoints: 125, sortOrder: 4 },
    { name: 'Taratari Business Manager', abbreviation: 'T.B.M', minGroupSales: 150, minTeamSize: 80, bvPoints: 150, pvPoints: 150, sortOrder: 5 },
    { name: 'Senior Taratari Business Mgr', abbreviation: 'ST.B.M', minGroupSales: 175, minTeamSize: 160, bvPoints: 175, pvPoints: 175, sortOrder: 6 },
    { name: 'Assist Sales Director', abbreviation: 'A.S.D', minGroupSales: 200, minTeamSize: 200, bvPoints: 200, pvPoints: 200, sortOrder: 7 },
    { name: 'Sales Director', abbreviation: 'S.D', minGroupSales: 320, minTeamSize: 320, bvPoints: 250, pvPoints: 250, sortOrder: 8 },
  ];

  for (const rank of ranks) {
    await Rank.findOneAndUpdate({ abbreviation: rank.abbreviation }, rank, { upsert: true, new: true });
  }
  console.log('Ranks seeded.');
}

async function seedSettings() {
  await Setting.findOneAndUpdate(
    { key: 'agent_approval_required' },
    { key: 'agent_approval_required', value: '0', type: 'boolean', group: 'business' },
    { upsert: true }
  );

  await Setting.findOneAndUpdate(
    { key: 'bv_per_sqft' },
    { key: 'bv_per_sqft', value: '1', type: 'float', group: 'business' },
    { upsert: true }
  );
  await Setting.findOneAndUpdate(
    { key: 'pv_per_sqft' },
    { key: 'pv_per_sqft', value: '1', type: 'float', group: 'business' },
    { upsert: true }
  );

  console.log('Settings seeded.');
}

async function seedUsers() {
  const superAdminRole = await Role.findOne({ slug: 'super_admin' });
  const subAdminRole = await Role.findOne({ slug: 'sub_admin' });
  const agentRole = await Role.findOne({ slug: 'agent' });
  const defaultRank = await Rank.findOne({ abbreviation: 'B.EX' });

  if (superAdminRole) {
    const hashed = await bcrypt.hash('12345678', 10);
    await User.findOneAndUpdate(
      { email: 'admin@mlm.com' },
      {
        name: 'Super Admin',
        email: 'admin@mlm.com',
        password: hashed,
        role: superAdminRole._id,
        status: 'active',
        isKycVerified: true,
        emailVerifiedAt: new Date(),
        referralCode: '112233',
      },
      { upsert: true, new: true }
    );
    console.log('Super Admin seeded (admin@mlm.com / 12345678)');
  }

  if (subAdminRole) {
    const exists = await User.findOne({ email: 'sub.admin@mlm.com' });
    if (!exists) {
      const hashed = await bcrypt.hash('password', 10);
      await User.create({
        name: 'Sub Admin',
        email: 'sub.admin@mlm.com',
        password: hashed,
        role: subAdminRole._id,
        status: 'active',
      });
      console.log('Sub Admin seeded (sub.admin@mlm.com / password)');
    }
  }

  if (agentRole) {
    const exists = await User.findOne({ email: 'agent@mlm.com' });
    if (!exists) {
      const hashed = await bcrypt.hash('password', 10);
      await User.create({
        name: 'Agent',
        email: 'agent@mlm.com',
        password: hashed,
        role: agentRole._id,
        rank: defaultRank ? defaultRank._id : null,
        status: 'active',
      });
      console.log('Agent seeded (agent@mlm.com / password)');
    }
  }
}

async function run() {
  await connectDB();
  await seedRoles();
  await seedRanks();
  await seedSettings();
  await seedUsers();
  console.log('Seeding complete.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});