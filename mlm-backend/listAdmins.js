require("dotenv").config();
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log("Connected to database:", mongoose.connection.name);
  const db = mongoose.connection.db;
  const count = await db.collection("users").countDocuments();
  console.log("Total documents in users collection:", count);
  const bookingCount = await db.collection("bookings").countDocuments();
  console.log("Total documents in bookings collection:", bookingCount);
  process.exit(0);
}).catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
