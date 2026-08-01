require('dotenv').config();
const mongoose = require('mongoose');
const Rank = require('./models/Rank');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const result = await Rank.deleteMany({ abbreviation: { $in: ['T/L', 'ST/L', 'S/D'] } });
  console.log('Deleted:', result.deletedCount);
  await mongoose.disconnect();
}

run();