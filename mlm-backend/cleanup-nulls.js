require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  await db.collection('customers').updateMany({ email: null }, { $unset: { email: '' } });
  await db.collection('customers').updateMany({ aadhaarNumber: null }, { $unset: { aadhaarNumber: '' } });
  await db.collection('customers').updateMany({ panNumber: null }, { $unset: { panNumber: '' } });
  console.log('Cleaned up null fields.');
  process.exit(0);
});