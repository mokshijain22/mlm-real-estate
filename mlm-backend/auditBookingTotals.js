// Run this from inside mlm-backend/ with: node auditBookingTotals.js
// Read-only audit — flags any booking where
// Total Amount != Token + DP(all DP-type entries) + EMIs + Registry
// This is the exact mismatch found in BK-0008, where money silently
// vanished from the schedule during a manual DP edit at creation time.
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const Booking = require('./models/Booking');
  const Emi = require('./models/Emi');

  const bookings = await Booking.find({ status: { $ne: 'cancelled' } });
  console.log(`Checking ${bookings.length} bookings...\n`);

  let mismatchCount = 0;

  for (const booking of bookings) {
    const emis = await Emi.find({ booking: booking._id, status: { $ne: 'cancelled' } });

    const tokenTotal = emis.filter((e) => e.emiNumber === 0).reduce((s, e) => s + e.amount, 0);
    const dpTotal = emis.filter((e) => e.emiNumber < 0).reduce((s, e) => s + e.amount, 0);
    const emiTotal = emis.filter((e) => e.emiNumber > 0 && e.emiNumber !== 99).reduce((s, e) => s + e.amount, 0);
    const registryTotal = emis.filter((e) => e.emiNumber === 99).reduce((s, e) => s + e.amount, 0);

    const scheduleSum = tokenTotal + dpTotal + emiTotal + registryTotal;
    const totalAmount = Number(booking.totalAmount) || 0;
    const diff = Math.round(totalAmount - scheduleSum);

    if (Math.abs(diff) > 1) {
      mismatchCount++;
      console.log(`⚠️  ${booking.bookingNumber} — mismatch of ₹${diff.toLocaleString('en-IN')}`);
      console.log(`   Total Amount: ₹${totalAmount.toLocaleString('en-IN')}`);
      console.log(`   Token: ₹${tokenTotal.toLocaleString('en-IN')} | DP: ₹${dpTotal.toLocaleString('en-IN')} | EMIs: ₹${emiTotal.toLocaleString('en-IN')} | Registry: ₹${registryTotal.toLocaleString('en-IN')}`);
      console.log(`   Schedule sums to: ₹${scheduleSum.toLocaleString('en-IN')}\n`);
    }
  }

  console.log(`\nDone. ${mismatchCount} booking(s) with a mismatch out of ${bookings.length} checked.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});