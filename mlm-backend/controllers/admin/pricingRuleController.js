const PricingRule = require('../../models/PricingRule');
const Project = require('../../models/Project');
const Booking = require('../../models/Booking');

// GET /api/admin/projects/:projectId/pricing-rules
async function index(req, res) {
  const rules = await PricingRule.find({ project: req.params.projectId }).sort({ sortOrder: 1, createdAt: 1 });
  res.json({ data: rules });
}

function buildConditions(body) {
  const c = body.conditions || {};
  return {
    dateRange: {
      enabled: !!c.date_range?.enabled,
      from: c.date_range?.from || null,
      to: c.date_range?.to || null,
    },
    selectedPlots: {
      enabled: !!c.selected_plots?.enabled,
      plots: Array.isArray(c.selected_plots?.plots) ? c.selected_plots.plots : [],
    },
    soldAreaThreshold: {
      enabled: !!c.sold_area_threshold?.enabled,
      sqft: Number(c.sold_area_threshold?.sqft) || 0,
    },
    firstN: {
      enabled: !!c.first_n?.enabled,
      count: parseInt(c.first_n?.count, 10) || 0,
    },
  };
}

function validateRule(body) {
  const errors = {};
  if (!body.name || !body.name.trim()) errors.name = 'Rule name is required.';
  if (body.rate === undefined || body.rate === '' || isNaN(Number(body.rate))) errors.rate = 'Rule rate is required.';
  if (body.owner_minimum === undefined || body.owner_minimum === '' || isNaN(Number(body.owner_minimum))) {
    errors.owner_minimum = 'Owner minimum cap is required.';
  }
  if (!errors.rate && !errors.owner_minimum && Number(body.owner_minimum) > Number(body.rate)) {
    errors.owner_minimum = 'Owner minimum cannot exceed rule rate.';
  }
  return errors;
}

// POST /api/admin/projects/:projectId/pricing-rules
async function store(req, res) {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const errors = validateRule(req.body);
  if (Object.keys(errors).length) return res.status(422).json({ errors });

  const rule = await PricingRule.create({
    project: project._id,
    name: req.body.name.trim(),
    rate: Number(req.body.rate),
    ownerMinimum: Number(req.body.owner_minimum),
    status: req.body.status === 'active' ? 'active' : 'draft',
    sortOrder: req.body.sort_order != null ? Number(req.body.sort_order) : 0,
    conditions: buildConditions(req.body),
    createdBy: req.user._id,
  });

  res.status(201).json({ data: rule });
}

// PUT /api/admin/projects/:projectId/pricing-rules/:id
async function update(req, res) {
  const rule = await PricingRule.findOne({ _id: req.params.id, project: req.params.projectId });
  if (!rule) return res.status(404).json({ message: 'Pricing rule not found.' });

  const errors = validateRule(req.body);
  if (Object.keys(errors).length) return res.status(422).json({ errors });

  rule.name = req.body.name.trim();
  rule.rate = Number(req.body.rate);
  rule.ownerMinimum = Number(req.body.owner_minimum);
  rule.status = req.body.status === 'active' ? 'active' : 'draft';
  rule.sortOrder = req.body.sort_order != null ? Number(req.body.sort_order) : 0;
  rule.conditions = buildConditions(req.body);
  await rule.save();

  res.json({ data: rule });
}

// DELETE /api/admin/projects/:projectId/pricing-rules/:id
async function remove(req, res) {
  const rule = await PricingRule.findOne({ _id: req.params.id, project: req.params.projectId });
  if (!rule) return res.status(404).json({ message: 'Pricing rule not found.' });
  await rule.deleteOne();
  res.json({ message: 'Pricing rule removed.' });
}

// GET /api/admin/projects/:projectId/pricing-rules/check-price
// Query: plot_id (optional), date (optional, default now)
async function checkPrice(req, res) {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const { plot_id, date } = req.query;
  const checkDate = date ? new Date(date) : new Date();

  const rules = await PricingRule.find({ project: project._id, status: 'active' }).sort({ sortOrder: 1, createdAt: 1 });

  const soldCount = await Booking.countDocuments({
    project: project._id,
    approvalStatus: 'approved',
  });
  const soldAreaAgg = await Booking.aggregate([
    { $match: { project: project._id, approvalStatus: 'approved' } },
    { $lookup: { from: 'plots', localField: 'plot', foreignField: '_id', as: 'plotDoc' } },
    { $unwind: { path: '$plotDoc', preserveNullAndEmptyArrays: true } },
    { $group: { _id: null, total: { $sum: '$plotDoc.totalArea' } } },
  ]);
  const soldArea = soldAreaAgg[0]?.total || 0;

  let matched = null;
  for (const rule of rules) {
    const c = rule.conditions || {};
    let ok = true;

    if (c.dateRange?.enabled) {
      if (c.dateRange.from && checkDate < new Date(c.dateRange.from)) ok = false;
      if (c.dateRange.to && checkDate > new Date(c.dateRange.to)) ok = false;
    }
    if (ok && c.selectedPlots?.enabled) {
      if (!plot_id || !c.selectedPlots.plots.some((p) => p.toString() === plot_id)) ok = false;
    }
    if (ok && c.soldAreaThreshold?.enabled) {
      if (soldArea < c.soldAreaThreshold.sqft) ok = false;
    }
    if (ok && c.firstN?.enabled) {
      if (soldCount >= c.firstN.count) ok = false;
    }

    if (ok) {
      matched = rule;
      break;
    }
  }

  if (matched) {
    return res.json({
      data: {
        matchedRule: matched.name,
        rate: matched.rate,
        ownerMinimum: matched.ownerMinimum,
        pool: matched.rate - matched.ownerMinimum,
        source: 'rule',
      },
    });
  }

  res.json({
    data: {
      matchedRule: null,
      rate: project.defaultRate,
      ownerMinimum: project.defaultOwnerMinimum,
      pool: (project.defaultRate || 0) - (project.defaultOwnerMinimum || 0),
      source: 'project_default',
    },
  });
}

module.exports = { index, store, update, remove, checkPrice };