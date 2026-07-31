require('dotenv').config();
require('express-async-errors');
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const customerBookingRoutes = require('./routes/customerBooking');
const emiRoutes = require('./routes/emi');
const agentRoutes = require('./routes/agent');

const app = express();
connectDB();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

app.use(express.json());
app.use('/storage', express.static(path.join(__dirname, 'storage', 'public'))); // serves layout SVGs, KYC docs etc.

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', customerBookingRoutes);
app.use('/api/admin', emiRoutes);
app.use('/api/agent', agentRoutes);

app.get('/', (req, res) => res.json({ status: 'MLM MERN API running' }));

// Global error handler — catches CastError, ValidationError etc. so the
// server never crashes on a single bad request; it just returns 400/500.
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ID format for field "${err.path}".` });
  }
  if (err.name === 'ValidationError') {
    return res.status(422).json({ message: err.message });
  }
  return res.status(500).json({ message: 'Something went wrong.', error: err.message });
});

// Catches errors thrown inside async route handlers that weren't try/caught
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
