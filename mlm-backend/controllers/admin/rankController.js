const Rank = require('../../models/Rank');
const User = require('../../models/User');

// GET /api/admin/ranks
async function index(req, res) {
  try {
    const ranks = await Rank.find().sort({ sortOrder: 1 });

    // Mirrors Laravel's Rank::withCount('agents')
    const ranksWithCount = await Promise.all(
      ranks.map(async (rank) => {
        const agentsCount = await User.countDocuments({ rank: rank._id });
        return { ...rank.toObject(), agentsCount };
      })
    );

    return res.json({ data: ranksWithCount });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch ranks.', error: err.message });
  }
}

// GET /api/admin/ranks/:id
async function show(req, res) {
  try {
    const rank = await Rank.findById(req.params.id);
    if (!rank) return res.status(404).json({ message: 'Rank not found.' });

    return res.json({ data: rank });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch rank.', error: err.message });
  }
}

// PATCH /api/admin/ranks/:id
async function update(req, res) {
  try {
    const { bv_points, pv_points, min_group_sales, min_team_size } = req.body;

    const errors = {};
    if (bv_points === undefined || bv_points === null || isNaN(bv_points) || Number(bv_points) < 0) {
      errors.bv_points = 'BV points is required and must be a non-negative number.';
    }
    if (pv_points === undefined || pv_points === null || isNaN(pv_points) || Number(pv_points) < 0) {
      errors.pv_points = 'PV points is required and must be a non-negative number.';
    }
    if (min_group_sales === undefined || min_group_sales === null || isNaN(min_group_sales) || Number(min_group_sales) < 0) {
      errors.min_group_sales = 'Minimum group sales is required and must be a non-negative number.';
    }
    if (
      min_team_size === undefined ||
      min_team_size === null ||
      isNaN(min_team_size) ||
      !Number.isInteger(Number(min_team_size)) ||
      Number(min_team_size) < 0
    ) {
      errors.min_team_size = 'Minimum team size is required and must be a non-negative integer.';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ errors });
    }

    const rank = await Rank.findById(req.params.id);
    if (!rank) return res.status(404).json({ message: 'Rank not found.' });

    rank.bvPoints = Number(bv_points);
    rank.pvPoints = Number(pv_points);
    rank.minGroupSales = Number(min_group_sales);
    rank.minTeamSize = Number(min_team_size);
    await rank.save();

    return res.json({ message: 'Rank updated successfully.', data: rank });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

module.exports = { index, show, update };