const Plot = require('../../models/Plot');
const Project = require('../../models/Project');
const plotMapGenerator = require('../../services/plotMapGenerator');

const PLOT_STATUSES = ['available', 'booked', 'sold'];

// mirrors Project::getRemainingAreaAttribute()
async function getRemainingArea(project, excludePlotId = null) {
  const filter = { project: project._id };
  if (excludePlotId) filter._id = { $ne: excludePlotId };

  const result = await Plot.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: '$totalArea' } } },
  ]);

  const occupied = result.length ? result[0].total : 0;
  return Number(project.totalArea) - occupied;
}

// GET /api/admin/projects/:projectId/plots?page=1
async function index(req, res) {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const [plots, total] = await Promise.all([
    Plot.find({ project: project._id }).skip(skip).limit(limit),
    Plot.countDocuments({ project: project._id }),
  ]);

  res.json({
    project,
    data: plots,
    meta: { page, limit, total, lastPage: Math.ceil(total / limit) },
  });
}

// GET /api/admin/projects/:projectId/plots/create (form meta, useful for React form init)
async function create(req, res) {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const remainingArea = await getRemainingArea(project);
  res.json({ project, statuses: PLOT_STATUSES, remainingArea });
}

// POST /api/admin/projects/:projectId/plots
async function store(req, res) {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const {
      plot_number, total_area, price_per_sqft, plc_amount, status,
      facing, zone_type, corner_plot, boundary_n, boundary_s, boundary_e, boundary_w,
    } = req.body;
    const remainingArea = await getRemainingArea(project);

    const errors = {};
    if (!plot_number) errors.plot_number = 'Plot number is required.';
    else {
      const dup = await Plot.findOne({ project: project._id, plotNumber: plot_number });
      if (dup) errors.plot_number = 'Plot number already exists in this project.';
    }
    if (!total_area || Number(total_area) < 0.01) errors.total_area = 'Total area must be at least 0.01.';
    else if (Number(total_area) > remainingArea) {
      errors.total_area = `The plot area exceeds the remaining project area (${remainingArea} sqft).`;
    }
    if (price_per_sqft === undefined || Number(price_per_sqft) < 0) errors.price_per_sqft = 'Price per sqft is required.';
    if (plc_amount !== undefined && Number(plc_amount) < 0) errors.plc_amount = 'PLC amount cannot be negative.';
    if (!status || !PLOT_STATUSES.includes(status)) errors.status = 'Invalid status.';

    if (Object.keys(errors).length) return res.status(422).json({ errors });

    const plot = await Plot.create({
      project: project._id,
      plotNumber: plot_number,
      totalArea: total_area,
      pricePerSqft: price_per_sqft,
      plcAmount: plc_amount || 0,
      status,
      facing: facing || '',
      zoneType: zone_type || '',
      cornerPlot: corner_plot || '',
      boundaryN: boundary_n || '',
      boundaryS: boundary_s || '',
      boundaryE: boundary_e || '',
      boundaryW: boundary_w || '',
      createdBy: req.user._id,
    });

    await plotMapGenerator.sync(project);

    return res.status(201).json({ message: 'Plot created successfully.', data: plot });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create plot.', error: err.message });
  }
}

// GET /api/admin/projects/:projectId/plots/:plotId
async function show(req, res) {
  const plot = await Plot.findOne({ _id: req.params.plotId, project: req.params.projectId });
  if (!plot) return res.status(404).json({ message: 'Plot not found.' });

  const project = await Project.findById(req.params.projectId);
  res.json({ project, plot });
}

// GET /api/admin/projects/:projectId/plots/:plotId/edit
async function edit(req, res) {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const plot = await Plot.findOne({ _id: req.params.plotId, project: project._id });
  if (!plot) return res.status(404).json({ message: 'Plot not found.' });

  const remainingArea = await getRemainingArea(project, plot._id);
  res.json({ project, plot, statuses: PLOT_STATUSES, remainingArea });
}

// PUT /api/admin/projects/:projectId/plots/:plotId
async function update(req, res) {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const plot = await Plot.findOne({ _id: req.params.plotId, project: project._id });
    if (!plot) return res.status(404).json({ message: 'Plot not found.' });

    const {
      plot_number, total_area, price_per_sqft, plc_amount, status,
      facing, zone_type, corner_plot, boundary_n, boundary_s, boundary_e, boundary_w,
    } = req.body;
    const remainingArea = await getRemainingArea(project, plot._id);

    const errors = {};
    if (!plot_number) errors.plot_number = 'Plot number is required.';
    else {
      const dup = await Plot.findOne({
        project: project._id,
        plotNumber: plot_number,
        _id: { $ne: plot._id },
      });
      if (dup) errors.plot_number = 'Plot number already exists in this project.';
    }
    if (!total_area || Number(total_area) < 0.01) errors.total_area = 'Total area must be at least 0.01.';
    else if (Number(total_area) > remainingArea) {
      errors.total_area = `The plot area exceeds the remaining project area (${remainingArea} sqft).`;
    }
    if (price_per_sqft === undefined || Number(price_per_sqft) < 0) errors.price_per_sqft = 'Price per sqft is required.';
    if (plc_amount !== undefined && Number(plc_amount) < 0) errors.plc_amount = 'PLC amount cannot be negative.';
    if (!status || !PLOT_STATUSES.includes(status)) errors.status = 'Invalid status.';

    if (Object.keys(errors).length) return res.status(422).json({ errors });

    plot.plotNumber = plot_number;
    plot.totalArea = total_area;
    plot.pricePerSqft = price_per_sqft;
    plot.plcAmount = plc_amount || 0;
    plot.status = status;
    plot.facing = facing || '';
    plot.zoneType = zone_type || '';
    plot.cornerPlot = corner_plot || '';
    plot.boundaryN = boundary_n || '';
    plot.boundaryS = boundary_s || '';
    plot.boundaryE = boundary_e || '';
    plot.boundaryW = boundary_w || '';
    await plot.save();

    await plotMapGenerator.sync(project);

    return res.json({ message: 'Plot updated successfully.', data: plot });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update plot.', error: err.message });
  }
}

// DELETE /api/admin/projects/:projectId/plots/:plotId
async function destroy(req, res) {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const plot = await Plot.findOne({ _id: req.params.plotId, project: project._id });
  if (!plot) return res.status(404).json({ message: 'Plot not found.' });

  plot.deletedAt = new Date(); // soft delete
  await plot.save();

  await plotMapGenerator.sync(project);

  return res.json({ message: 'Plot deleted successfully.' });
}

// PATCH /api/admin/plots/:plotId/status  (AJAX status update)
async function updateStatus(req, res) {
  const plot = await Plot.findById(req.params.plotId);
  if (!plot) return res.status(404).json({ message: 'Plot not found.' });

  const { status } = req.body;
  if (!status || !PLOT_STATUSES.includes(status)) {
    return res.status(422).json({ errors: { status: 'Invalid status.' } });
  }

  plot.status = status;
  await plot.save();

  return res.json({ success: true, status: plot.status, message: 'Plot status updated successfully.' });
}

// GET /api/admin/projects/:projectId/plots/available
async function availablePlots(req, res) {
  const plots = await Plot.find(
    { project: req.params.projectId, status: 'available' },
    'plotNumber totalArea pricePerSqft plcAmount'
  );
  return res.json(plots);
}

module.exports = { index, create, store, show, edit, update, destroy, updateStatus, availablePlots };
