const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', protect, authController.logout);
router.get('/validate-referral/:code', authController.validateReferralCode);
router.get('/profile', protect, authController.getProfile);
router.patch('/profile', protect, authController.updateProfile);

module.exports = router;
