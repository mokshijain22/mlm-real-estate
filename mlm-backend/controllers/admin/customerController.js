const Customer = require('../../models/Customer');

// GET /api/admin/customers?status=active&page=1
async function index(req, res) {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const page = parseInt(req.query.page) || 1;
  const limit = 15;
  const skip = (page - 1) * limit;

  const [customers, total] = await Promise.all([
    Customer.find(filter).populate('addedBy', 'name email').sort({ _id: -1 }).skip(skip).limit(limit),
    Customer.countDocuments(filter),
  ]);

  res.json({
    data: customers,
    meta: { page, limit, total, lastPage: Math.ceil(total / limit) },
  });
}

// POST /api/admin/customers
async function store(req, res) {
  try {
    const {
      name, email, phone, alternate_phone, address, city, state,
      pincode, aadhaar_number, pan_number, status,
    } = req.body;

    const errors = {};
    if (!name) errors.name = 'Name is required.';
    if (!phone || !/^\d{10,15}$/.test(phone)) errors.phone = 'Valid phone (10-15 digits) is required.';
    if (pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number)) {
      errors.pan_number = 'The PAN number format is invalid (e.g. ABCDE1234F).';
    }
    if (pincode && !/^\d{6}$/.test(pincode)) errors.pincode = 'Pincode must be 6 digits.';
    if (aadhaar_number && !/^\d{12}$/.test(aadhaar_number)) errors.aadhaar_number = 'Aadhaar must be 12 digits.';
    if (!status || !['active', 'inactive'].includes(status)) errors.status = 'Invalid status.';

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
      status,
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

    return res.status(201).json({ message: 'Customer created successfully.', data: customer });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create customer.', error: err.message });
  }
}

// GET /api/admin/customers/:id
async function show(req, res) {
  const customer = await Customer.findById(req.params.id).populate('addedBy', 'name email');
  if (!customer) return res.status(404).json({ message: 'Customer not found.' });
  res.json({ data: customer });
}

// PUT /api/admin/customers/:id
async function update(req, res) {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });

    const {
      name, email, phone, alternate_phone, address, city, state,
      pincode, aadhaar_number, pan_number, status,
    } = req.body;

    const errors = {};
    if (!name) errors.name = 'Name is required.';
    if (!phone || !/^\d{10,15}$/.test(phone)) errors.phone = 'Valid phone (10-15 digits) is required.';
    if (pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number)) {
      errors.pan_number = 'The PAN number format is invalid (e.g. ABCDE1234F).';
    }
    if (pincode && !/^\d{6}$/.test(pincode)) errors.pincode = 'Pincode must be 6 digits.';
    if (aadhaar_number && !/^\d{12}$/.test(aadhaar_number)) errors.aadhaar_number = 'Aadhaar must be 12 digits.';
    if (!status || !['active', 'inactive'].includes(status)) errors.status = 'Invalid status.';
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
    customer.email = email || null;
    customer.phone = phone;
    customer.alternatePhone = alternate_phone || null;
    customer.address = address || null;
    customer.city = city || null;
    customer.state = state || null;
    customer.pincode = pincode || null;
    customer.aadhaarNumber = aadhaar_number || null;
    customer.panNumber = pan_number || null;
    customer.status = status;
    await customer.save();

    return res.json({ message: 'Customer updated successfully.', data: customer });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update customer.', error: err.message });
  }
}

// DELETE /api/admin/customers/:id
async function destroy(req, res) {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Customer not found.' });

  customer.deletedAt = new Date();
  await customer.save();

  return res.json({ message: 'Customer deleted successfully.' });
}

module.exports = { index, store, show, update, destroy };