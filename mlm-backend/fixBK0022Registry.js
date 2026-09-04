require("dotenv").config();
const mongoose = require("mongoose");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const Booking = require("./models/Booking");
  const Emi = require("./models/Emi");

  const booking = await Booking.findOne({ bookingNumber: "BK-0022" });
  if (!booking) { console.log("Booking not found"); process.exit(1); }

  const paidUnderpaidEmis = await Emi.find({
    booking: booking._id,
    status: "paid",
    amountReceived: { $ne: null },
  });

  let totalDiff = 0;
  paidUnderpaidEmis.forEach((e) => {
    const diff = Number(e.amount) - Number(e.amountReceived);
    if (diff !== 0) {
      console.log(`EMI #${e.emiNumber}: scheduled ${e.amount}, received ${e.amountReceived}, diff ${diff}`);
      totalDiff += diff;
    }
  });

  console.log(`\nTotal diff to push into Registry: ${totalDiff}`);

  const registryEmi = await Emi.findOne({ booking: booking._id, emiNumber: 99 });
  const newAmount = Math.max(Number(registryEmi.amount) + totalDiff, 0);
  console.log(`Registry amount: ${registryEmi.amount} -> ${newAmount}`);

  registryEmi.amount = newAmount;
  const pricePerSqft = Number(booking.pricePerSqft) || 0;
  if (pricePerSqft > 0) {
    const baseAmount = Math.max(Number(booking.totalAmount) - Number(booking.plcAmount || 0), 0);
    const commissionRatio = booking.totalAmount > 0 ? baseAmount / booking.totalAmount : 1;
    registryEmi.sqftPortion = Math.round(((newAmount * commissionRatio) / pricePerSqft) * 100) / 100;
  }
  await registryEmi.save();
  booking.registryAmount = newAmount;
  await booking.save();

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
