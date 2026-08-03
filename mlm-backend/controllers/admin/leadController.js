const Lead = require('../../models/Lead');

// GET /api/admin/leads
async function index(req, res) {
  const { search, status, project_id, agent_id, source } = req.query;

  const filter = {};
  if (status && status !== 'all') filter.status = status;
  if (project_id) filter.project = project_id;
  if (agent_id) filter.assignedAgent = agent_id;
  if (source && source !== 'all') filter.source = source;
  if (search && search.trim()) {
    const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: re }, { mobile: re }, { plotNumber: re }];
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .populate('project', 'name')
      .populate('assignedAgent', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Lead.countDocuments(filter),
  ]);

  res.json({ data: leads, meta: { page, limit, total, lastPage: Math.ceil(total / limit) } });
}

// GET /api/admin/leads/:id
async function show(req, res) {
  const lead = await Lead.findById(req.params.id).populate('project', 'name').populate('assignedAgent', 'name');
  if (!lead) return res.status(404).json({ message: 'Lead not found.' });
  res.json({ data: lead });
}

// POST /api/admin/leads
async function store(req, res) {
  const { name, mobile, email, project_id, plot_number, location, budget, source, status, assigned_agent_id, notes } = req.body;

  const errors = {};
  if (!name || !name.trim()) errors.name = 'Name is required.';
  if (!mobile || !mobile.trim()) errors.mobile = 'Mobile number is required.';
  if (Object.keys(errors).length) return res.status(422).json({ errors });

  const lead = await Lead.create({
    name: name.trim(),
    mobile: mobile.trim(),
    email: email || null,
    project: project_id || null,
    plotNumber: plot_number || null,
    location: location || null,
    budget: budget != null && budget !== '' ? Number(budget) : null,
    source: source || 'other',
    status: status || 'new',
    assignedAgent: assigned_agent_id || null,
    notes: notes || null,
    createdBy: req.user._id,
  });

  res.status(201).json({ data: lead });
}

// PUT /api/admin/leads/:id
async function update(req, res) {
  const { name, mobile, email, project_id, plot_number, location, budget, source, status, assigned_agent_id, notes } = req.body;

  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ message: 'Lead not found.' });

  if (name !== undefined) {
    if (!name.trim()) return res.status(422).json({ errors: { name: 'Name is required.' } });
    lead.name = name.trim();
  }
  if (mobile !== undefined) {
    if (!mobile.trim()) return res.status(422).json({ errors: { mobile: 'Mobile number is required.' } });
    lead.mobile = mobile.trim();
  }
  if (email !== undefined) lead.email = email || null;
  if (project_id !== undefined) lead.project = project_id || null;
  if (plot_number !== undefined) lead.plotNumber = plot_number || null;
  if (location !== undefined) lead.location = location || null;
  if (budget !== undefined) lead.budget = budget !== '' && budget != null ? Number(budget) : null;
  if (source !== undefined) lead.source = source;
  if (status !== undefined) lead.status = status;
  if (assigned_agent_id !== undefined) lead.assignedAgent = assigned_agent_id || null;
  if (notes !== undefined) lead.notes = notes || null;

  await lead.save();
  res.json({ data: lead });
}

// DELETE /api/admin/leads/:id
async function remove(req, res) {
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ message: 'Lead not found.' });
  lead.deletedAt = new Date();
  await lead.save();
  res.json({ message: 'Lead removed.' });
}

module.exports = { index, show, store, update, remove };