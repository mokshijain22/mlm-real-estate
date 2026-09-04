require("dotenv").config();
const mongoose = require("mongoose");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const Booking = require("./models/Booking");
  const Emi = require("./models/Emi");

  const booking = await Booking.findOne({ bookingNumber: "BK-0022" });
  const registryEmi = await Emi.findOne({ booking: booking._id, emiNumber: 99 });

  console.log(`Reverting Registry: ${registryEmi.amount} -> ${booking.registryBaseAmount}`);
  registryEmi.amount = booking.registryBaseAmount;

  const pricePerSqft = Number(booking.pricePerSqft) || 0;
  if (pricePerSqft > 0) {
    const baseAmount = Math.max(Number(booking.totalAmount) - Number(booking.plcAmount || 0), 0);
    const commissionRatio = booking.totalAmount > 0 ? baseAmount / booking.totalAmount : 1;
    registryEmi.sqftPortion = Math.round(((registryEmi.amount * commissionRatio) / pricePerSqft) * 100) / 100;
  }
  await registryEmi.save();

  booking.registryAmount = booking.registryBaseAmount;
  await booking.save();

  console.log("Done — Grand Total Commission should be back to normal now. Remember: this booking still owes an extra ₹120 that is no longer tracked anywhere until the code fix is deployed.");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
