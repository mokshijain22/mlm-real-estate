const Project = require('../../models/Project');
const Plot = require('../../models/Plot');
const plotMapGenerator = require('../../services/plotMapGenerator');

// GET /api/agent/projects
async function index(req, res) {
  const projects = await Project.find({ status: 'active' }).sort({ _id: -1 }).lean();
  const counts = await Plot.aggregate([
    { $match: { project: { $in: projects.map((p) => p._id) } } },
    { $group: { _id: '$project', count: { $sum: 1 } } },
  ]);
  const countMap = {};
  counts.forEach((c) => (countMap[c._id.toString()] = c.count));
  const withCounts = projects.map((p) => ({ ...p, plotsCount: countMap[p._id.toString()] || 0 }));
  return res.json({ projects: withCounts });
}

// GET /api/agent/projects/:id
async function show(req, res) {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const plots = await Plot.find({ project: project._id });

  return res.json({ project, plots });
}

// GET /api/agent/projects/:id/map
async function map(req, res) {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const plots = await Plot.find({ project: project._id });

  // Auto-generate sample map if none exists (mirrors Laravel)
  if (!project.layoutSvg && plots.length > 0) {
    const generatedPath = await plotMapGenerator.generate(project);
    project.layoutSvg = generatedPath;
    await project.save();
  }

  return res.json({ project, plots });
}

module.exports = { index, show, map };