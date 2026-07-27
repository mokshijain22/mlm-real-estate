const express = require('express');
const router = express.Router();

const customerController = require('../controllers/admin/customerController');
const bookingController = require('../controllers/admin/bookingController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect, restrictTo('super_admin', 'sub_admin'));

router.get('/customers', customerController.index);
router.post('/customers', customerController.store);
router.get('/customers/:id', customerController.show);
router.put('/customers/:id', customerController.update);
router.delete('/customers/:id', customerController.destroy);

router.get('/bookings', bookingController.index);
router.get('/bookings/pending', bookingController.pending);
router.get('/bookings/create', bookingController.create);
router.post('/bookings', bookingController.store);
router.get('/bookings/:id', bookingController.show);
router.post('/bookings/:id/cancel', bookingController.cancel);
router.post('/bookings/:id/approve', bookingController.approve);
router.post('/bookings/:id/reject', bookingController.reject);

module.exports = router;