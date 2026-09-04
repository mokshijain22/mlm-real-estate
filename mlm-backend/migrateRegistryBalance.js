require("dotenv").config();
const mongoose = require("mongoose");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const Booking = require("./models/Booking");
  const Emi = require("./models/Emi");

  const bookings = await Booking.find({ registryBalance: { $ne: 0 } });
  console.log(`Found ${bookings.length} booking(s) with a leftover registryBalance to migrate.\n`);

  for (const booking of bookings) {
    const diff = Number(booking.registryBalance) || 0;
    const registryEmi = await Emi.findOne({ booking: booking._id, emiNumber: 99 });
    if (!registryEmi) {
      console.log(`${booking.bookingNumber}: no Registry line found, skipping.`);
      continue;
    }

    const newAmount = Math.max(Number(registryEmi.amount) + diff, 0);
    console.log(
      `${booking.bookingNumber}: registryBalance was ${diff} -> Registry amount ${registryEmi.amount} -> ${newAmount}`
    );

    registryEmi.amount = newAmount;
    const pricePerSqft = Number(booking.pricePerSqft) || 0;
    if (pricePerSqft > 0) {
      const baseAmount = Math.max(Number(booking.totalAmount) - Number(booking.plcAmount || 0), 0);
      const commissionRatio = booking.totalAmount > 0 ? baseAmount / booking.totalAmount : 1;
      registryEmi.sqftPortion = Math.round(((newAmount * commissionRatio) / pricePerSqft) * 100) / 100;
    }
    await registryEmi.save();

    booking.registryAmount = newAmount;
    booking.registryBalance = 0;
    await booking.save();
  }

  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
