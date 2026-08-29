// Run this from inside mlm-backend/ with: node fixMissingRegistryAmounts.js
// By default this is a DRY RUN — it only prints what it WOULD change.
// Run with --apply to actually write the fix: node fixMissingRegistryAmounts.js --apply
//
// What it does, per mismatched booking (found by auditBookingTotals.js):
//   1. If a Registry Emi (emiNumber 99) already exists but is short, tops
//      up its amount by the missing gap.
//   2. If no Registry Emi exists at all, creates one for the missing gap.
//   3. Updates booking.registryAmount to match, so the Registry Commission
//      preview (which reads that field directly) stops showing 0.
//   4. Re-syncs booking.remainingAmount / downPaymentAmount from the real
//      Emi documents, same as the ongoing edit/add-DP fixes do.
require('dotenv').config();
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const Booking = require('./models/Booking');
  const Emi = require('./models/Emi');

  const bookings = await Booking.find({ status: { $ne: 'cancelled' } });
  let fixedCount = 0;

  for (const booking of bookings) {
    const emis = await Emi.find({ booking: booking._id, status: { $ne: 'cancelled' } });

    const tokenTotal = emis.filter((e) => e.emiNumber === 0).reduce((s, e) => s + e.amount, 0);
    const dpTotal = emis.filter((e) => e.emiNumber < 0).reduce((s, e) => s + e.amount, 0);
    const emiTotal = emis.filter((e) => e.emiNumber > 0 && e.emiNumber !== 99).reduce((s, e) => s + e.amount, 0);
    const registryEmi = emis.find((e) => e.emiNumber === 99);
    const registryTotal = registryEmi ? registryEmi.amount : 0;

    const scheduleSum = tokenTotal + dpTotal + emiTotal + registryTotal;
    const totalAmount = Number(booking.totalAmount) || 0;
    const gap = Math.round(totalAmount - scheduleSum);

    if (Math.abs(gap) <= 1) continue;

    const pricePerSqft = Number(booking.pricePerSqft) || 0;
    const plcAmount = Number(booking.plcAmount) || 0;
    const baseAmount = Math.max(totalAmount - plcAmount, 0);
    const commissionRatio = totalAmount > 0 ? baseAmount / totalAmount : 1;
    const sqftFor = (amt) => (pricePerSqft > 0 ? Math.round(((Number(amt) * commissionRatio) / pricePerSqft) * 100) / 100 : 0);

    const newRegistryAmount = registryTotal + gap;

    console.log(`\n${booking.bookingNumber}: gap of ₹${gap.toLocaleString('en-IN')}`);
    console.log(`  Registry: ₹${registryTotal.toLocaleString('en-IN')} -> ₹${newRegistryAmount.toLocaleString('en-IN')}`);

    if (APPLY) {
      if (registryEmi) {
        registryEmi.amount = newRegistryAmount;
        registryEmi.sqftPortion = sqftFor(newRegistryAmount);
        await registryEmi.save();
      } else {
        const fallbackDate = new Date(booking.bookingDate);
        fallbackDate.setMonth(fallbackDate.getMonth() + Number(booking.emiMonths || 0) + 1);
        await Emi.create({
          booking: booking._id,
          agent: booking.agent,
          emiNumber: 99,
          amount: newRegistryAmount,
          sqftPortion: sqftFor(newRegistryAmount),
          dueDate: booking.registryDueDate || fallbackDate,
          status: 'pending',
          commissionProcessed: false,
          createdBy: null,
        });
      }

      booking.registryAmount = newRegistryAmount;
      // Re-sync the same booking-level summary fields the ongoing edit/add-DP
      // fixes maintain, so top-of-page cards match reality too.
      const freshEmis = await Emi.find({ booking: booking._id, status: { $ne: 'cancelled' } });
      booking.downPaymentAmount = freshEmis.filter((e) => e.emiNumber < 0).reduce((s, e) => s + e.amount, 0);
      booking.remainingAmount = freshEmis.filter((e) => e.emiNumber > 0).reduce((s, e) => s + e.amount, 0);
      await booking.save();

      console.log(`  ✅ Applied.`);
    }

    fixedCount++;
  }

  console.log(`\n${APPLY ? 'Fixed' : 'Would fix'} ${fixedCount} booking(s).`);
  if (!APPLY) console.log('This was a dry run — nothing was changed. Re-run with --apply to write the fix.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});