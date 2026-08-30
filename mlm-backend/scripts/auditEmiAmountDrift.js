/**
 * Audit-only (no writes): finds bookings where booking.emiAmount (the
 * "uniform" snapshot field set at creation) no longer matches the average
 * of that booking's actual regular EMI records (emiNumber > 0) — which is
 * what the commission preview / EMI schedule actually pays out.
 *
 * This drift happens when a booking is created with per-row EMI amount
 * overrides (booking.emiAmounts[]) that differ from the uniform
 * booking.emiAmount fallback used elsewhere (e.g. report exports).
 * BK-0008 is a known instance of this; this script finds any others.
 *
 * Run with:  node scripts/auditEmiAmountDrift.js
 */
const mongoose = require('mongoose');
require('dotenv').config();

const Booking = require('../models/Booking');
const Emi = require('../models/Emi');

const TOLERANCE = 0.01; // rupees

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGO_URI / MONGODB_URI found in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected. Scanning bookings for emiAmount drift...\n');

  const bookings = await Booking.find({ emiMonths: { $gt: 0 } }).select(
    'bookingNumber emiAmount emiMonths'
  );

  const flagged = [];

  for (const booking of bookings) {
    const regularEmis = await Emi.find({
      booking: booking._id,
      emiNumber: { $gt: 0, $lt: 99 },
    }).select('amount');

    if (regularEmis.length === 0) continue;

    const sum = regularEmis.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const actualAvg = sum / regularEmis.length;
    const stored = Number(booking.emiAmount) || 0;
    const diff = Math.abs(actualAvg - stored);

    if (diff > TOLERANCE) {
      flagged.push({
        bookingNumber: booking.bookingNumber,
        storedEmiAmount: stored,
        actualAvgEmiAmount: Math.round(actualAvg * 100) / 100,
        emiCount: regularEmis.length,
        diffPerEmi: Math.round(diff * 100) / 100,
        totalDiff: Math.round(diff * regularEmis.length * 100) / 100,
      });
    }
  }

  if (flagged.length === 0) {
    console.log('No drift found — booking.emiAmount matches the actual EMI schedule everywhere.');
  } else {
    console.log(`Found ${flagged.length} booking(s) with drift:\n`);
    console.table(flagged);
    console.log(
      '\nThese bookings\' stored emiAmount is stale. The commission preview already reads the ' +
      'real Emi schedule (fixed), but any code path still reading booking.emiAmount directly ' +
      '(e.g. exports) will show the wrong number for these until emiAmount is corrected or that ' +
      'field is fully retired.'
    );
  }

  process.exit(0);
}

run().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});