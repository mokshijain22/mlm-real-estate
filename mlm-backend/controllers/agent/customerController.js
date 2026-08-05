const Customer = require('../../models/Customer');
const Booking = require('../../models/Booking');

// GET /api/agent/customers
async function index(req, res) {
  const customers = await Customer.find({ addedBy: req.user._id }).sort({ createdAt: -1 });
  return res.json({ customers });
}

// POST /api/agent/customers
async function store(req, res) {
  try {
    const {
      name, email, phone, alternate_phone, address, city, state,
      pincode, aadhaar_number, pan_number,
    } = req.body;

    const errors = {};
    if (!name) errors.name = 'Name is required.';
    if (!phone || !/^\d{10,15}$/.test(phone)) errors.phone = 'Valid phone (10-15 digits) is required.';
    if (pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number)) {
      errors.pan_number = 'The PAN number format is invalid (e.g. ABCDE1234F).';
    }
    if (pincode && !/^\d{6}$/.test(pincode)) errors.pincode = 'Pincode must be 6 digits.';
    if (aadhaar_number && !/^\d{12}$/.test(aadhaar_number)) errors.aadhaar_number = 'Aadhaar must be 12 digits.';
    if (Object.keys(errors).length) return res.status(422).json({ errors });

    if (email) {
      const dup = await Customer.findOne({ email });
      if (dup) return res.status(422).json({ errors: { email: 'Email already exists.' } });
    }
    const dupPhone = await Customer.findOne({ phone });
    if (dupPhone) return res.status(422).json({ errors: { phone: 'Phone already exists.' } });
    if (aadhaar_number) {
      const dupAadhaar = await Customer.findOne({ aadhaarNumber: aadhaar_number });
      if (dupAadhaar) return res.status(422).json({ errors: { aadhaar_number: 'Aadhaar already exists.' } });
    }
    if (pan_number) {
      const dupPan = await Customer.findOne({ panNumber: pan_number });
      if (dupPan) return res.status(422).json({ errors: { pan_number: 'PAN already exists.' } });
    }

    const count = await Customer.countDocuments();
    const customerCode = `CUST${String(count + 1).padStart(4, '0')}`;

    const customerData = {
      customerCode,
      name,
      phone,
      addedBy: req.user._id,
    };
    if (email) customerData.email = email;
    if (alternate_phone) customerData.alternatePhone = alternate_phone;
    if (address) customerData.address = address;
    if (city) customerData.city = city;
    if (state) customerData.state = state;
    if (pincode) customerData.pincode = pincode;
    if (aadhaar_number) customerData.aadhaarNumber = aadhaar_number;
    if (pan_number) customerData.panNumber = pan_number;

    const customer = await Customer.create(customerData);

    return res.status(201).json({ message: 'Customer added successfully.', data: customer });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create customer.', error: err.message });
  }
}

// PUT /api/agent/customers/:id
async function update(req, res) {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, addedBy: req.user._id });
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });

    const {
      name, email, phone, alternate_phone, address, city, state,
      pincode, aadhaar_number, pan_number,
    } = req.body;

    const errors = {};
    if (!name) errors.name = 'Name is required.';
    if (!phone || !/^\d{10,15}$/.test(phone)) errors.phone = 'Valid phone (10-15 digits) is required.';
    if (pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number)) {
      errors.pan_number = 'The PAN number format is invalid (e.g. ABCDE1234F).';
    }
    if (pincode && !/^\d{6}$/.test(pincode)) errors.pincode = 'Pincode must be 6 digits.';
    if (aadhaar_number && !/^\d{12}$/.test(aadhaar_number)) errors.aadhaar_number = 'Aadhaar must be 12 digits.';
    if (Object.keys(errors).length) return res.status(422).json({ errors });

    if (email) {
      const dup = await Customer.findOne({ email, _id: { $ne: customer._id } });
      if (dup) return res.status(422).json({ errors: { email: 'Email already exists.' } });
    }
    const dupPhone = await Customer.findOne({ phone, _id: { $ne: customer._id } });
    if (dupPhone) return res.status(422).json({ errors: { phone: 'Phone already exists.' } });
    if (aadhaar_number) {
      const dupAadhaar = await Customer.findOne({ aadhaarNumber: aadhaar_number, _id: { $ne: customer._id } });
      if (dupAadhaar) return res.status(422).json({ errors: { aadhaar_number: 'Aadhaar already exists.' } });
    }
    if (pan_number) {
      const dupPan = await Customer.findOne({ panNumber: pan_number, _id: { $ne: customer._id } });
      if (dupPan) return res.status(422).json({ errors: { pan_number: 'PAN already exists.' } });
    }

    customer.name = name;
    customer.phone = phone;
    customer.email = email || undefined;
    customer.alternatePhone = alternate_phone || undefined;
    customer.address = address || undefined;
    customer.city = city || undefined;
    customer.state = state || undefined;
    customer.pincode = pincode || undefined;
    customer.aadhaarNumber = aadhaar_number || undefined;
    customer.panNumber = pan_number || undefined;

    await customer.save();

    return res.json({ message: 'Customer updated successfully.', data: customer });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update customer.', error: err.message });
  }
}

// GET /api/agent/customers/:id
async function show(req, res) {
  const customer = await Customer.findOne({ _id: req.params.id, addedBy: req.user._id });
  if (!customer) return res.status(404).json({ message: 'Customer not found.' });

  const bookings = await Booking.find({ customer: customer._id, agent: req.user._id })
    .populate('plot')
    .populate('project');

  return res.json({ customer, bookings });
}

module.exports = { index, store, show, update };