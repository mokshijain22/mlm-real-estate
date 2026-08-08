// Run this from inside mlm-backend/ with: node checkBooking.js
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  require('./models/Project');
  require('./models/User');
  const Booking = require('./models/Booking');

  const booking = await Booking.findOne({ bookingNumber: 'BK-0007' })
    .populate('project')
    .populate('agent', 'name slabPerSqft');

  if (!booking) {
    console.log('Booking BK-0007 not found');
    process.exit(1);
  }

  console.log('bookingNumber:', booking.bookingNumber);
  console.log('pricePerSqft:', booking.pricePerSqft);
  console.log('commissionCapPerSqft:', booking.commissionCapPerSqft);
  console.log('uplineCommissionCapsPerSqft:', JSON.stringify(booking.uplineCommissionCapsPerSqft));
  console.log('companyRatePerSqft (snapshot):', booking.companyRatePerSqft);
  console.log('agent.name:', booking.agent?.name);
  console.log('agent.slabPerSqft (default cap):', booking.agent?.slabPerSqft);
  console.log('project.commissionPool:', booking.project?.commissionPool);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});