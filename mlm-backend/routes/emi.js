const express = require('express');
const router = express.Router();

const emiController = require('../controllers/admin/emiController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect, restrictTo('super_admin', 'sub_admin'));

router.get('/emis', emiController.index);
router.get('/emis/overdue', emiController.overdue);
router.get('/bookings/:id/emis', emiController.bookingEmis);
router.post('/emis/:id/mark-paid', emiController.markPaid);

module.exports = router;