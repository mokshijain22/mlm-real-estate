require("dotenv").config();
const mongoose = require("mongoose");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const Booking = require("./models/Booking");
  const Emi = require("./models/Emi");

  const bookings = await Booking.find({ status: { $ne: "cancelled" } });
  let updated = 0;

  for (const booking of bookings) {
    if (Number(booking.registryBaseAmount) > 0) continue; // already backfilled

    const emis = await Emi.find({ booking: booking._id, status: { $ne: "cancelled" } });
    const tokenTotal = emis.filter((e) => e.emiNumber === 0).reduce((s, e) => s + Number(e.amount || 0), 0);
    const dpTotal = emis.filter((e) => e.emiNumber < 0).reduce((s, e) => s + Number(e.amount || 0), 0);
    const emiTotal = emis
      .filter((e) => e.emiNumber > 0 && e.emiNumber !== 99)
      .reduce((s, e) => s + Number(e.amount || 0), 0);

    const totalAmount = Number(booking.totalAmount) || 0;
    const cleanRegistryBase = Math.max(totalAmount - tokenTotal - dpTotal - emiTotal, 0);

    console.log(`${booking.bookingNumber}: registryBaseAmount -> ${cleanRegistryBase} (live registryAmount stays ${booking.registryAmount})`);

    booking.registryBaseAmount = cleanRegistryBase;
    await booking.save();
    updated++;
  }

  console.log(`\nBackfilled ${updated} booking(s).`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
