const PaymentPlan = require('../../models/PaymentPlan');
const Project = require('../../models/Project');

// GET /api/admin/projects/:projectId/payment-plans
async function index(req, res) {
  const plans = await PaymentPlan.find({ project: req.params.projectId }).sort({ sortOrder: 1, createdAt: 1 });
  res.json({ data: plans });
}

// PUT /api/admin/projects/:projectId/payment-plans
// Replaces the full set of plans for this project in one go, matching the
// wizard's single "Save payment plans" button that saves everything at once.
async function replace(req, res) {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const plans = Array.isArray(req.body.plans) ? req.body.plans : [];

  const errors = [];
  plans.forEach((p, i) => {
    if (!p.name || !p.name.trim()) errors.push(`Plan ${i + 1}: name is required.`);
    const dpTotal = (p.down_payment_stages || []).reduce((s, st) => s + (Number(st.percent) || 0), 0);
    const emiTotal = (Number(p.emi_percent) || 0) * (parseInt(p.emi_count, 10) || 0);
    if (dpTotal + emiTotal > 100) {
      errors.push(`Plan ${i + 1} (${p.name}): down payment + EMIs exceed 100% of selling price.`);
    }
  });
  if (errors.length) return res.status(422).json({ message: errors.join(' ') });

  // Only one default plan allowed — first one marked default wins.
  let defaultSeen = false;
  const docs = plans.map((p, i) => {
    const isDefault = !!p.is_default && !defaultSeen;
    if (isDefault) defaultSeen = true;
    return {
      project: project._id,
      name: p.name.trim(),
      bookingAmount: Number(p.booking_amount) || 0,
      editableAtBooking: !!p.editable_at_booking,
      isDefault,
      plcEnabled: !!p.plc_enabled,
      plcOptions: (p.plc_options || [])
        .filter((o) => o.label && o.label.trim())
        .map((o) => ({ label: o.label.trim(), percent: Number(o.percent) || 0 })),
      downPaymentStages: (p.down_payment_stages || [])
        .filter((s) => s.label && s.label.trim())
        .map((s) => ({ label: s.label.trim(), percent: Number(s.percent) || 0 })),
      emiPercent: Number(p.emi_percent) || 0,
      emiCount: parseInt(p.emi_count, 10) || 0,
      sortOrder: i,
    };
  });

  if (docs.length && !defaultSeen) docs[0].isDefault = true;

  await PaymentPlan.deleteMany({ project: project._id });
  const created = docs.length ? await PaymentPlan.insertMany(docs) : [];

  res.json({ message: 'Payment plans saved.', data: created });
}

module.exports = { index, replace };