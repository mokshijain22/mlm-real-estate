// Run this from inside mlm-backend/ with: node fixSqftPortionRounding.js
// By default this is a DRY RUN — it only prints what it WOULD change.
// Run with --apply to actually write the fix: node fixSqftPortionRounding.js --apply
//
// What it fixes:
//   generateEmis() rounds each installment's sqftPortion to 2 decimals
//   independently (Booking Token, DP, DP2, every EMI, Registry). Across
//   20-30 lines those roundings drop small fractions that add up, so the
//   sum of all sqftPortion values ends up LESS than the booking's actual
//   commissionable sqft (totalArea, adjusted for any PLC). Since every
//   agent's commission = sqftPortion × rate, that missing sqft quietly
//   shrinks every projected commission total on the booking too.
//
// This script finds that gap per booking and adds it onto ONE existing,
// still-pending Emi line (never a paid one — a paid line's commission may
// already be credited off its current sqftPortion, and changing it after
// the fact would desync the wallet ledger from the Emi record). It prefers
// the Registry line (99) since that's almost always still pending; if
// there is no pending line at all, it skips the booking and reports it
// separately so you can look at those manually.
require('dotenv').config();
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const Booking = require('./models/Booking');
  const Emi = require('./models/Emi');

  const bookings = await Booking.find({ status: { $ne: 'cancelled' } });
  let fixedCount = 0;
  let skippedNoPendingLine = 0;

  for (const booking of bookings) {
    const emis = await Emi.find({ booking: booking._id, status: { $ne: 'cancelled' } });
    if (emis.length === 0) continue;

    // totalArea IS the correct commissionable sqft target already — PLC is
    // a price premium on top, it never adds extra area. (commissionRatio is
    // only needed when converting a rupee AMOUNT to sqft via sqftFor(); it
    // must not be applied a second time to totalArea, which was never a
    // rupee figure to begin with.)
    const expectedTotalSqft = Math.round((Number(booking.totalArea) || 0) * 100) / 100;
    const assignedTotalSqft = emis.reduce((sum, e) => sum + (Number(e.sqftPortion) || 0), 0);
    const diff = Math.round((expectedTotalSqft - assignedTotalSqft) * 100) / 100;

    if (diff === 0) continue;

    // Prefer Registry (99), then the highest-numbered EMI, then any other
    // pending line — but always a PENDING one, never 'paid'/'overdue' data
    // that commission has already been calculated and credited against.
    const pendingLines = emis.filter((e) => e.status === 'pending');
    const target =
      pendingLines.find((e) => e.emiNumber === 99) ||
      pendingLines.sort((a, b) => b.emiNumber - a.emiNumber)[0] ||
      null;

    if (!target) {
      console.log(`\n${booking.bookingNumber}: sqft off by ${diff} but no pending line to absorb it — SKIPPED, check manually.`);
      skippedNoPendingLine++;
      continue;
    }

    console.log(
      `\n${booking.bookingNumber}: total sqft short by ${diff} (assigned ${assignedTotalSqft}, expected ${expectedTotalSqft}). ` +
        `Adjusting EMI #${target.emiNumber} sqftPortion: ${target.sqftPortion} -> ${Math.round((Number(target.sqftPortion) + diff) * 100) / 100}`
    );

    if (APPLY) {
      target.sqftPortion = Math.round((Number(target.sqftPortion) + diff) * 100) / 100;
      await target.save();
      console.log(`  ✅ Applied.`);
    }

    fixedCount++;
  }

  console.log(`\n${APPLY ? 'Fixed' : 'Would fix'} ${fixedCount} booking(s).`);
  if (skippedNoPendingLine > 0) {
    console.log(`${skippedNoPendingLine} booking(s) had a gap but no pending line to adjust — review those manually.`);
  }
  if (!APPLY) console.log('This was a dry run — nothing was changed. Re-run with --apply to write the fix.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});