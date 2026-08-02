const SiteVisit = require('../../models/SiteVisit');

// GET /api/admin/site-visits
async function index(req, res) {
  const { search, date_from, date_to, project_id, agent_id } = req.query;

  const filter = {};
  if (project_id) filter.project = project_id;
  if (agent_id) filter.agent = agent_id;
  if (date_from || date_to) {
    filter.visitDate = {};
    if (date_from) filter.visitDate.$gte = new Date(date_from);
    if (date_to) filter.visitDate.$lte = new Date(date_to);
  }
  if (search && search.trim()) {
    const re = new RegExp(search.trim(), 'i');
    filter.$or = [{ customerName: re }, { mobile: re }];
  }

  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const [visits, total] = await Promise.all([
    SiteVisit.find(filter)
      .populate('project')
      .populate('agent')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    SiteVisit.countDocuments(filter),
  ]);

  res.json({ data: visits, meta: { page, limit, total, lastPage: Math.ceil(total / limit) } });
}

module.exports = { index };