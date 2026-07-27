const AuditLog = require('../../models/AuditLog');
const User = require('../../models/User');

// GET /api/admin/audit-logs?user_id=&action=&date_from=&date_to=&ip_address=&page=
async function index(req, res) {
  try {
    const { user_id, action, date_from, date_to, ip_address } = req.query;

    const query = {};
    if (user_id) query.user = user_id;
    if (action) query.action = action;
    if (ip_address) query.ipAddress = { $regex: ip_address, $options: 'i' };

    if (date_from || date_to) {
      query.createdAt = {};
      if (date_from) query.createdAt.$gte = new Date(date_from);
      if (date_to) {
        const end = new Date(date_to);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 25;
    const skip = (page - 1) * limit;

    const [logs, total, actions, users] = await Promise.all([
      AuditLog.find(query)
        .populate('user', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(query),
      AuditLog.distinct('action'),
      User.find().select('name').sort({ name: 1 }),
    ]);

    return res.json({
      data: logs,
      meta: { page, limit, total, lastPage: Math.ceil(total / limit) },
      filters: { actions, users },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch audit logs.', error: err.message });
  }
}

module.exports = { index };