// Run this from inside mlm-backend/ with: node diagnoseCommissionGap.js BK-0008
// Read-only — prints every number that feeds into the commission preview for
// one booking, so we can see exactly where the ₹550/sqft assumption breaks
// down (points-to-rupee multiplier, or caps) instead of guessing.
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const Booking = require('./models/Booking');
  const User = require('./models/User');
  const Rank = require('./models/Rank');
  const settingService = require('./services/settingService');
  const { isOnlineMode } = require('./utils/paymentModes');

  const bookingNumber = process.argv[2] || 'BK-0008';
  const booking = await Booking.findOne({ bookingNumber }).populate('agent').populate('agentRank');
  if (!booking) {
    console.log(`Booking ${bookingNumber} not found`);
    process.exit(1);
  }

  const mode = booking.paymentMode;
  const pointsType = isOnlineMode(mode) ? 'BV' : 'PV';
  const multiplier = await settingService.get(`${pointsType.toLowerCase()}_per_sqft`, 1.0);

  console.log(`\n=== ${bookingNumber} ===`);
  console.log('Payment Mode:', mode, '-> points type:', pointsType);
  console.log(`${pointsType.toLowerCase()}_per_sqft multiplier (points -> ₹):`, multiplier);
  console.log('Seller default cap (slabPerSqft):', booking.agent?.slabPerSqft);
  console.log('Seller cap on THIS booking (commissionCapPerSqft):', booking.commissionCapPerSqft);
  console.log('Upline caps on THIS booking (uplineCommissionCapsPerSqft):', JSON.stringify(booking.uplineCommissionCapsPerSqft));
  console.log('Company rate snapshot (companyRatePerSqft):', booking.companyRatePerSqft);
  console.log('Rank at booking:', booking.agentRank?.name, '| bvPoints:', booking.agentRank?.bvPoints, '| pvPoints:', booking.agentRank?.pvPoints);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});