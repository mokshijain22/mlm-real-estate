const fs = require('fs');
const path = require('path');
const Setting = require('../../models/Setting');
const settingService = require('../../services/settingService');
const auditService = require('../../services/auditService');

// GET /api/admin/settings
async function index(req, res) {
  try {
    const settings = await Setting.find();

    const map = {};
    for (const s of settings) {
      map[s.key] = await settingService.get(s.key);
    }

    return res.json({ settings: map });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch settings.', error: err.message });
  }
}

// PATCH /api/admin/settings
// Expects multipart/form-data if site_logo file is included (use settingsUpload.single('site_logo') in route),
// otherwise plain JSON body works too.
async function update(req, res) {
  try {
    const {
      agent_approval_required,
      tds_percentage,
      owner_tds_percentage,
      min_withdrawal_amount,
      site_title,
      site_phone,
      site_email,
      site_address,
      site_copyright,
    } = req.body;

    const errors = {};
    if (agent_approval_required === undefined || !['0', '1', 0, 1].includes(agent_approval_required)) {
      errors.agent_approval_required = 'Agent approval required must be 0 or 1.';
    }
    if (tds_percentage === undefined || isNaN(tds_percentage) || Number(tds_percentage) < 0 || Number(tds_percentage) > 100) {
      errors.tds_percentage = 'TDS percentage is required and must be between 0 and 100.';
    }
    if (owner_tds_percentage === undefined || isNaN(owner_tds_percentage) || Number(owner_tds_percentage) < 0 || Number(owner_tds_percentage) > 100) {
      errors.owner_tds_percentage = 'Owner TDS percentage is required and must be between 0 and 100.';
    }
    if (min_withdrawal_amount === undefined || isNaN(min_withdrawal_amount) || Number(min_withdrawal_amount) < 0) {
      errors.min_withdrawal_amount = 'Minimum withdrawal amount is required and must be a non-negative number.';
    }
    if (!site_title || !String(site_title).trim()) {
      errors.site_title = 'Site title is required.';
    }
    if (site_email && !/^\S+@\S+\.\S+$/.test(site_email)) {
      errors.site_email = 'Site email must be a valid email address.';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ errors });
    }

    // Handle logo upload (req.file set by settingsUpload.single('site_logo') middleware)
    if (req.file) {
      const oldLogoPath = await settingService.get('site_logo');
      if (oldLogoPath) {
        const fullOldPath = path.join(__dirname, '..', '..', 'storage', 'public', oldLogoPath);
        if (fs.existsSync(fullOldPath)) fs.unlinkSync(fullOldPath);
      }
      const relativePath = `settings/${req.file.filename}`;
      await settingService.set('site_logo', relativePath, 'string', 'business');
    }

    await Promise.all([
      settingService.set('agent_approval_required', String(agent_approval_required) === '1', 'boolean', 'agent'),
      settingService.set('tds_percentage', Number(tds_percentage), 'float', 'withdrawal'),
      settingService.set('owner_tds_percentage', Number(owner_tds_percentage), 'float', 'withdrawal'),
      settingService.set('min_withdrawal_amount', Number(min_withdrawal_amount), 'float', 'withdrawal'),
      settingService.set('site_title', site_title.trim(), 'string', 'business'),
      settingService.set('site_phone', site_phone || '', 'string', 'business'),
      settingService.set('site_email', site_email || '', 'string', 'business'),
      settingService.set('site_address', site_address || '', 'string', 'business'),
      settingService.set('site_copyright', site_copyright || '', 'string', 'business'),
    ]);

    await auditService.log(req, 'settings.updated', `System settings updated by ${req.user.name}`);

    const settings = await Setting.find();
    const map = {};
    for (const s of settings) {
      map[s.key] = await settingService.get(s.key);
    }

    return res.json({ message: 'Settings updated successfully.', settings: map });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

// GET /api/settings/public — no auth, used by login/register pages
async function publicSettings(req, res) {
  try {
    const logo = await settingService.get('site_logo');
    const title = await settingService.get('site_title');
    return res.json({
      site_logo: logo || null,
      site_title: title || 'MLM Real Estate',
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch settings.', error: err.message });
  }
}

module.exports = { index, update, publicSettings };