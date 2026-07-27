const Project = require('../../models/Project');
const Plot = require('../../models/Plot');
const plotMapGenerator = require('../../services/plotMapGenerator');

// GET /api/agent/projects
async function index(req, res) {
  const projects = await Project.find({ status: 'active' }).sort({ _id: -1 });
  return res.json({ projects });
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