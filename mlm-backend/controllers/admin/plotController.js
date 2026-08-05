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

  const filter = { project: project._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search && req.query.search.trim()) {
    const re = new RegExp(req.query.search.trim(), 'i');
    filter.$or = [{ plotNumber: re }];
  }

  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const [plots, total] = await Promise.all([
    Plot.find(filter).skip(skip).limit(limit),
    Plot.countDocuments(filter),
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
      plot_number, total_area, price_per_sqft, plc_percent, status,
      facing, zone_type, corner_plot, boundary_n, boundary_s, boundary_e, boundary_w,
      length, width,
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
    if (plc_percent !== undefined && (Number(plc_percent) < 0 || Number(plc_percent) > 100)) errors.plc_percent = 'PLC percent must be between 0 and 100.';
    if (!status || !PLOT_STATUSES.includes(status)) errors.status = 'Invalid status.';

    if (Object.keys(errors).length) return res.status(422).json({ errors });

    const plot = await Plot.create({
      project: project._id,
      plotNumber: plot_number,
      totalArea: total_area,
      pricePerSqft: price_per_sqft,
      plcPercent: plc_percent || 0,
      status,      
      length: length || null,
      width: width || null,
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
      plot_number, total_area, price_per_sqft, plc_percent, status,
      facing, zone_type, corner_plot, boundary_n, boundary_s, boundary_e, boundary_w,
      length, width,
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
    if (plc_percent !== undefined && (Number(plc_percent) < 0 || Number(plc_percent) > 100)) errors.plc_percent = 'PLC percent must be between 0 and 100.';
    if (!status || !PLOT_STATUSES.includes(status)) errors.status = 'Invalid status.';

    if (Object.keys(errors).length) return res.status(422).json({ errors });

    plot.plotNumber = plot_number;
    plot.totalArea = total_area;
    plot.pricePerSqft = price_per_sqft;
    plot.plcPercent = plc_percent || 0;
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
    'plotNumber totalArea pricePerSqft plcPercent'
  );
  return res.json(plots);
}

// POST /api/admin/projects/:projectId/plots/bulk-import
// Bulk-create plots from rows already parsed client-side from a CSV
// (number, total_area, price_per_sqft, status, plc_amount). Plot numbers
// that already exist for this project are skipped (not overwritten), so
// this is safe to re-run.
async function bulkImport(req, res) {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    if (!rows.length) {
      return res.status(422).json({ errors: { rows: 'At least one row is required.' } });
    }

    const existingPlots = await Plot.find({ project: project._id }, 'plotNumber');
    const existingNumbers = new Set(existingPlots.map((p) => p.plotNumber.toLowerCase().trim()));

    let remainingArea = await getRemainingArea(project);
    let created = 0;
    const skippedExisting = [];
    const skippedNoSpace = [];
    const skippedMissingArea = [];

    // Parses a "WxH" dimension string (e.g. "25x63") into its area in sqft.
    // Returns null if the string isn't a recognisable WxH pair.
    const parseDimensionArea = (val) => {
      const match = String(val || '').trim().match(/^(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)$/);
      if (!match) return null;
      return Number(match[1]) * Number(match[2]);
    };

    for (const row of rows) {
      // Accept either our standard header ("number") or this project's
      // export format ("plot_number").
      const number = String(row.number || row.plot_number || '').trim();
      const key = number.toLowerCase();

      if (!number || existingNumbers.has(key)) {
        if (number) skippedExisting.push(number);
        continue;
      }

      // total_area may arrive as a plain sqft number, OR as a "WxH" size
      // string (e.g. "25x63") from the project's own CSV format.
      let area = Number(row.total_area);
      if (!area) {
        area = parseDimensionArea(row.total_area) || parseDimensionArea(row.size) || 0;
      }
      if (!area || area <= 0) {
        skippedMissingArea.push(number);
        continue;
      }
      if (area > remainingArea) {
        skippedNoSpace.push(number);
        continue;
      }

      const price = Number(row.price_per_sqft) || Number(row.base_price) || Number(row.final_price) || 0;

      await Plot.create({
        project: project._id,
        plotNumber: number,
        totalArea: area,
        pricePerSqft: price,
        plcPercent: Number(row.plc_percent) || 0,
        status: PLOT_STATUSES.includes(row.status) ? row.status : 'available',
        createdBy: req.user._id,
      });

      existingNumbers.add(key);
      remainingArea -= area;
      created++;
    }

    await plotMapGenerator.sync(project);

    return res.json({
      success: true,
      created,
      skipped_existing: skippedExisting,
      skipped_no_space: skippedNoSpace,
      skipped_missing_area: skippedMissingArea,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Bulk import failed.', error: err.message });
  }
}

// POST /api/admin/projects/:projectId/plots/quick-create
// Create a plot AND its drawn map shape in a single step — used by the
// "Draw New Plot" tool on the Map Builder page (draw a rectangle, fill in
// the details in the popup, save).
async function quickCreate(req, res) {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });

   const {
      plot_number, total_area, price_per_sqft, plc_percent, status, map_coordinates,
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
    if (!map_coordinates) errors.map_coordinates = 'Map coordinates are required.';

    if (Object.keys(errors).length) return res.status(422).json({ errors });

    const plot = await Plot.create({
      project: project._id,
      plotNumber: plot_number,
      totalArea: total_area,
      pricePerSqft: price_per_sqft,
      plcPercent: Number(plc_percent) || 0,
      status: PLOT_STATUSES.includes(status) ? status : 'available',
      mapCoordinates: map_coordinates,
      createdBy: req.user._id,
    });

    return res.status(201).json({ success: true, plot });
  } catch (err) {
    return res.status(500).json({ message: 'Quick create failed.', error: err.message });
  }
}

// GET /api/admin/projects/:projectId/plots/map
// Returns ALL plots (any status) for a project, including their drawn map
// coordinates, so a digital map picker can render every plot color-coded
// by status. Falls back to the auto-generated SVG grid layout when no
// hand-drawn polygons exist yet.
async function mapPlots(req, res) {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const plots = await Plot.find(
    { project: project._id },
    'plotNumber totalArea pricePerSqft plcPercent status mapCoordinates'
  );

  const hasHandDrawnLayout = plots.some((p) => !!p.mapCoordinates);

  let layoutSvgUrl = null;
  if (!hasHandDrawnLayout) {
    await plotMapGenerator.sync(project);
    const refreshed = await Project.findById(project._id);
    layoutSvgUrl = refreshed.layoutSvgUrl || null;
  }

  return res.json({
    plots: plots.map((p) => ({
      id: p._id,
      plot_number: p.plotNumber,
      total_area: p.totalArea,
      price_per_sqft: p.pricePerSqft,
      plc_percent: p.plcPercent,
      status: p.status,
      coordinates: p.mapCoordinates,
    })),
    layout_svg_url: layoutSvgUrl,
  });
}

module.exports = {
  index, create, store, show, edit, update, destroy, updateStatus, availablePlots,
  bulkImport, quickCreate, mapPlots,
};
