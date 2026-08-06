/**
 * One-time backfill: fills companyRatePerSqft on existing bookings that don't
 * have it yet (created before this field existed, so it's sitting at the 0
 * default). Uses TODAY's agent slabPerSqft + Project commissionPool as the
 * best available approximation — historical values from booking time aren't
 * recoverable, so this is best-effort for old data only. New bookings going
 * forward already get an accurate snapshot at creation time.
 *
 * Run with:  node scripts/backfillCompanyRate.js
 */
const mongoose = require('mongoose');
require('dotenv').config();

const Booking = require('../models/Booking');
const commissionService = require('../services/commissionService');

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGO_URI / MONGODB_URI found in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected. Scanning bookings...');

  const bookings = await Booking.find({
    $or: [{ companyRatePerSqft: { $exists: false } }, { companyRatePerSqft: 0 }],
  })
    .populate('agent')
    .populate('project');

  console.log(`Found ${bookings.length} booking(s) to check.`);

  let updated = 0;
  let skipped = 0;

  for (const booking of bookings) {
    if (!booking.agent || !booking.project) {
      skipped++;
      continue;
    }

    const pool = booking.project.commissionPool || 0;
    const rate = await commissionService.getCompanyRatePerSqft(booking.agent, pool);

    if (rate > 0) {
      booking.companyRatePerSqft = rate;
      await booking.save();
      updated++;
      console.log(`  ${booking.bookingNumber}: companyRatePerSqft = ${rate}`);
    } else {
      skipped++;
    }
  }

  console.log(`\nDone. Updated ${updated}, skipped ${skipped} (no agent/project or rate was 0).`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});