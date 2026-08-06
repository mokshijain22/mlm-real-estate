const SiteVisit = require('../../models/SiteVisit');

// GET /api/agent/site-visits
async function index(req, res) {
  const visits = await SiteVisit.find({ agent: req.user._id }).populate('project').sort({ createdAt: -1 });
  res.json({ data: visits });
}

// POST /api/agent/site-visits
async function store(req, res) {
  const { customer_name, mobile, alt_mobile, email, address, project_id } = req.body;

  const errors = {};
  if (!customer_name || !customer_name.trim()) errors.customer_name = 'Customer name is required.';
  if (!mobile || !/^\d{10}$/.test(mobile)) errors.mobile = 'Valid 10-digit mobile is required.';
  if (!project_id) errors.project_id = 'Project is required.';
  if (Object.keys(errors).length) return res.status(422).json({ errors });

  const visit = await SiteVisit.create({
    customerName: customer_name.trim(),
    mobile,
    altMobile: alt_mobile || null,
    email: email || null,
    address: address || null,
    project: project_id,
    agent: req.user._id,
    photo: req.file ? `/storage/site-visits/${req.file.filename}` : null,
    // Visit date/time is always the server's current moment — never trust a
    // client-supplied value, so agents cannot backdate or spoof it via the API.
    visitDate: new Date(),
  });

  res.status(201).json({ message: 'Site visit logged.', data: visit });
}

module.exports = { index, store };