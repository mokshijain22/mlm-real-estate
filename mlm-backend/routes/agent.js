const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { profileUpload } = require('../middleware/upload');
const profileController = require('../controllers/profileController');const dashboardController = require('../controllers/agent/dashboardController');
const bookingController = require('../controllers/agent/bookingController');
const customerController = require('../controllers/agent/customerController');
const projectController = require('../controllers/agent/projectController');
const kycController = require('../controllers/agent/kycController');
const commissionController = require('../controllers/agent/commissionController');
const rankController = require('../controllers/agent/rankController');
const referralController = require('../controllers/agent/referralController');
const ticketController = require('../controllers/agent/ticketController');
const walletController = require('../controllers/agent/walletController');
const siteVisitController = require('../controllers/agent/siteVisitController');
const { kycUpload, siteVisitUpload } = require('../middleware/upload');

router.use(protect, restrictTo('agent'));
router.get('/profile', profileController.show);
router.put('/profile', profileUpload.single('profile_photo'), profileController.update);
router.put('/profile/password', profileController.updatePassword);

router.get('/dashboard', dashboardController.index);

router.get('/bookings', bookingController.index);
router.get('/bookings/create-data', bookingController.createData);
router.post('/bookings', bookingController.store);
router.get('/bookings/:id', bookingController.show);

router.get('/customers', customerController.index);
router.post('/customers', customerController.store);
router.get('/customers/:id', customerController.show);
router.put('/customers/:id', customerController.update);

router.get('/projects', projectController.index);
router.get('/projects/:id', projectController.show);
router.get('/projects/:id/map', projectController.map);

router.get('/site-visits', siteVisitController.index);
router.post('/site-visits', siteVisitUpload.single('photo'), siteVisitController.store);

router.get('/kyc', kycController.index);
router.post(
  '/kyc',
  kycUpload.fields([
    { name: 'aadhaar_front', maxCount: 1 },
    { name: 'aadhaar_back', maxCount: 1 },
    { name: 'pan_document', maxCount: 1 },
    { name: 'bank_proof', maxCount: 1 },
  ]),
  kycController.store
);
router.get('/kyc/status', kycController.status);

router.get('/commissions', commissionController.index);

router.get('/rank', rankController.index);

router.get('/referrals', referralController.index);
router.get('/referrals/team', referralController.team);



router.get('/tickets', ticketController.index);
router.post('/tickets', ticketController.store);
router.get('/tickets/:id', ticketController.show);
router.patch('/tickets/:id/reopen', ticketController.reopen);

router.get('/wallet', walletController.index);
router.post('/wallet/withdraw', walletController.withdraw);
router.get('/wallet/transactions', walletController.transactions);

module.exports = router;