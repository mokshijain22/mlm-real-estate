require('dotenv').config();
const connectDB = require('./config/db');
const Booking = require('./models/Booking');

async function run() {
  await connectDB();
  const b = await Booking.findOne({ bookingNumber: 'BK-0008' });
  console.log('commissionCapPerSqft:', b.commissionCapPerSqft);
  console.log('executiveGaveDiscount:', b.executiveGaveDiscount);
  console.log('executiveDiscountRemarks:', b.executiveDiscountRemarks);
  console.log('createdBy:', b.createdBy);
  console.log('agent:', b.agent);
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });