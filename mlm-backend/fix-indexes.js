require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  await db.collection('customers').dropIndex('aadhaarNumber_1').catch(() => {});
  await db.collection('customers').dropIndex('panNumber_1').catch(() => {});
  const Customer = require('./models/Customer');
  await Customer.syncIndexes();
  console.log('Indexes fixed.');
  process.exit(0);
});