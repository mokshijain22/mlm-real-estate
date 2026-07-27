require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const indexes = await db.collection('customers').indexes();
  console.log(JSON.stringify(indexes, null, 2));
  process.exit(0);
});