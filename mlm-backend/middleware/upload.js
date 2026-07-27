const multer = require('multer');
const path = require('path');
const fs = require('fs');

function makeUploader(subfolder) {
  const dest = path.join(__dirname, '..', 'storage', 'public', subfolder);
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });

  return multer({ storage });
}

// KYC uploads go into storage/public/kyc/<userId>/ — destination depends on
// the logged-in user, so it needs its own dynamic multer instance instead
// of the fixed-subfolder makeUploader() above.
const kycStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(__dirname, '..', 'storage', 'public', 'kyc', String(req.user._id));
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const kycUpload = multer({
  storage: kycStorage,
  limits: { fileSize: 3 * 1024 * 1024 }, // ~3MB, mirrors Laravel's max:3048 (KB)
  fileFilter: (req, file, cb) => {
    const allowed = /jpg|jpeg|png|pdf/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error('Only jpg, jpeg, png, pdf files are allowed.'));
  },
});

module.exports = {
  layoutUpload: makeUploader('layouts'),
  kycUpload,
  settingsUpload: makeUploader('settings'),
  profileUpload: makeUploader('profiles'),
  mapImageUpload: makeUploader('map-images'),
};
