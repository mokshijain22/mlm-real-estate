const fs = require('fs');
const path = require('path');

const Project = require('../../models/Project');
const Plot = require('../../models/Plot');
const plotMapGenerator = require('../../services/plotMapGenerator');

const PROJECT_STATUSES = ['active', 'inactive', 'completed'];
const PLOT_ACTIVE_STATUSES = ['booked', 'sold'];

// GET /api/admin/projects?page=1
async function index(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const [projects, total] = await Promise.all([
    Project.find().sort({ _id: -1 }).skip(skip).limit(limit),
    Project.countDocuments(),
  ]);

  const projectIds = projects.map((p) => p._id);
  const counts = await Plot.aggregate([
    { $match: { project: { $in: projectIds }, deletedAt: null } },
    { $group: { _id: '$project', count: { $sum: 1 } } },
  ]);
  const countMap = {};
  counts.forEach((c) => { countMap[c._id.toString()] = c.count; });

  const data = projects.map((p) => ({
    ...p.toObject(),
    plotsCount: countMap[p._id.toString()] || 0,
  }));

  res.json({
    data,
    meta: { page, limit, total, lastPage: Math.ceil(total / limit) },
  });
}

// POST /api/admin/projects
async function store(req, res) {
  try {
    const { name, description, location, total_area, status } = req.body;

    const errors = {};
    if (!name) errors.name = 'Name is required.';
    if (!total_area || Number(total_area) < 1) errors.total_area = 'Total area must be at least 1.';
    if (!status || !PROJECT_STATUSES.includes(status)) errors.status = 'Invalid status.';
    if (Object.keys(errors).length) return res.status(422).json({ errors });

    const payload = {
      name,
      description: description || null,
      location: location || null,
      totalArea: total_area,
      status,
      createdBy: req.user._id,
    };

    // req.file comes from multer (layoutUpload.single('layout_svg'))
    if (req.file) {
      payload.layoutSvg = `layouts/${req.file.filename}`;
    }

    const project = await Project.create(payload);

    if (!req.file) {
      await plotMapGenerator.sync(project);
    }

    return res.status(201).json({ message: 'Project created successfully.', data: project });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create project.', error: err.message });
  }
}

// GET /api/admin/projects/:id
async function show(req, res) {
  const project = await Project.findById(req.params.id);
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
    plots: { data: plots, meta: { page, limit, total, lastPage: Math.ceil(total / limit) } },
  });
}

// PUT /api/admin/projects/:id
async function update(req, res) {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const { name, description, location, total_area, status } = req.body;

    const errors = {};
    if (!name) errors.name = 'Name is required.';
    if (!total_area || Number(total_area) < 1) errors.total_area = 'Total area must be at least 1.';
    if (!status || !PROJECT_STATUSES.includes(status)) errors.status = 'Invalid status.';
    if (Object.keys(errors).length) return res.status(422).json({ errors });

    project.name = name;
    project.description = description || null;
    project.location = location || null;
    project.totalArea = total_area;
    project.status = status;

    if (req.file) {
      // delete old layout file if it exists on disk
      if (project.layoutSvg) {
        const oldPath = path.join(__dirname, '../../storage/public', project.layoutSvg);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      project.layoutSvg = `layouts/${req.file.filename}`;
    }

    await project.save();

    if (!req.file) {
      await plotMapGenerator.sync(project);
    }

    return res.json({ message: 'Project updated successfully.', data: project });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update project.', error: err.message });
  }
}

// DELETE /api/admin/projects/:id
async function destroy(req, res) {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const hasActivePlots = await Plot.exists({
    project: project._id,
    status: { $in: PLOT_ACTIVE_STATUSES },
  });

  if (hasActivePlots) {
    return res.status(422).json({ message: 'Cannot delete project with booked or sold plots.' });
  }

  project.deletedAt = new Date(); // soft delete
  await project.save();

  return res.json({ message: 'Project deleted successfully.' });
}

// GET /api/admin/projects/:id/builder
async function builder(req, res) {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const plots = await Plot.find({ project: project._id });
  return res.json({ project, plots });
}

// POST /api/admin/projects/:id/layout
async function saveLayout(req, res) {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const { map_data, plots } = req.body;

  if (map_data !== undefined) {
    project.mapData = map_data;
    await project.save();
  }

  if (plots && typeof plots === 'object') {
    const ops = Object.entries(plots).map(([plotId, coordinates]) =>
      Plot.updateOne({ _id: plotId, project: project._id }, { mapCoordinates: coordinates })
    );
    await Promise.all(ops);
  }

  return res.json({ success: true, message: 'Layout saved successfully.' });
}

// GET /api/admin/projects/:id/map
async function map(req, res) {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  await plotMapGenerator.sync(project);

  const plots = await Plot.find({ project: project._id });
  return res.json({ project, plots });
}

// POST /api/admin/projects/:id/map-image
async function uploadMapImage(req, res) {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found.' });
  if (!req.file) return res.status(422).json({ message: 'No image uploaded.' });

  project.mapData = {
    ...(project.mapData || {}),
    imageUrl: `map-images/${req.file.filename}`,
    uploadedAt: new Date(),
  };
  await project.save();

  return res.json({ message: 'Map image uploaded.', project });
}

module.exports = { index, store, show, update, destroy, builder, saveLayout, map, uploadMapImage };
