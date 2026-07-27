const express = require('express');
const router = express.Router();

const projectController = require('../controllers/admin/projectController');
const agentController = require('../controllers/admin/agentController');
const kycController = require('../controllers/admin/kycController');
const plotController = require('../controllers/admin/plotController');
const withdrawalController = require('../controllers/admin/withdrawalController');
const ticketController = require('../controllers/admin/ticketController');
const rankController = require('../controllers/admin/rankController');
const auditLogController = require('../controllers/admin/auditLogController');
const referralController = require('../controllers/admin/referralController');
const subAdminController = require('../controllers/admin/subAdminController');
const reportController = require('../controllers/admin/reportController');
const settingsController = require('../controllers/admin/settingsController');
const customerController = require('../controllers/admin/customerController');
const emiController = require('../controllers/admin/emiController');
const bookingController = require('../controllers/admin/bookingController');
const dashboardController = require('../controllers/admin/dashboardController');
const profileController = require('../controllers/profileController');
const { settingsUpload, profileUpload } = require('../middleware/upload');
const { protect, restrictTo, requirePermission } = require('../middleware/auth');
const { layoutUpload, mapImageUpload } = require('../middleware/upload');

// all admin routes require login + super_admin/sub_admin role
router.use(protect, restrictTo('super_admin', 'sub_admin'));

// Dashboard
router.get('/dashboard', dashboardController.index);

// Profile
router.get('/profile', profileController.show);
router.put('/profile', profileUpload.single('profile_photo'), profileController.update);
router.put('/profile/password', profileController.updatePassword);

// Projects
router.use('/projects', requirePermission('projects'));
router.get('/projects', projectController.index);
router.post('/projects', layoutUpload.single('layout_svg'), projectController.store);
router.get('/projects/:id', projectController.show);
router.put('/projects/:id', layoutUpload.single('layout_svg'), projectController.update);
router.delete('/projects/:id', projectController.destroy);
router.get('/projects/:id/builder', projectController.builder);
router.post('/projects/:id/layout', projectController.saveLayout);
router.post('/projects/:id/map-image', mapImageUpload.single('map_image'), projectController.uploadMapImage);router.post('/projects/:id/map-image', layoutUpload.single('layout_svg') && require('../middleware/upload').mapImageUpload.single('map_image'), projectController.uploadMapImage);router.get('/projects/:id/map', projectController.map);

// Plots (nested under project)
router.get('/projects/:projectId/plots', plotController.index);
router.get('/projects/:projectId/plots/create', plotController.create);
router.post('/projects/:projectId/plots', plotController.store);
router.get('/projects/:projectId/plots/available', plotController.availablePlots);
router.get('/projects/:projectId/plots/:plotId', plotController.show);
router.get('/projects/:projectId/plots/:plotId/edit', plotController.edit);
router.put('/projects/:projectId/plots/:plotId', plotController.update);
router.delete('/projects/:projectId/plots/:plotId', plotController.destroy);
router.patch('/plots/:plotId/status', plotController.updateStatus);

// Agents
router.use('/agents', requirePermission('agents'));
router.get('/agents', agentController.index);
router.get('/agents/:id', agentController.show);
router.get('/agents/:id/tree', agentController.tree);
router.patch('/agents/:id/approve', agentController.approve);
router.patch('/agents/:id/deactivate', agentController.deactivate);
router.patch('/agents/:id/activate', agentController.activate);
router.get('/agents/:id/rank-history', agentController.rankHistory);

// KYC
router.use('/kyc', requirePermission('kyc'));
router.get('/kyc', kycController.index);
router.get('/kyc/:id', kycController.show);
router.patch('/kyc/:id/approve', kycController.approve);
router.patch('/kyc/:id/reject', kycController.reject);

// EMIs
router.use('/emis', requirePermission('emis'));
router.get('/emis', emiController.index);
router.get('/emis/overdue', emiController.overdue);
router.get('/bookings/:id/emis', emiController.bookingEmis);
router.post('/emis/:id/mark-paid', emiController.markPaid);

// Bookings
router.use('/bookings', requirePermission('bookings'));
router.get('/bookings', bookingController.index);
router.get('/bookings/pending', bookingController.pending);
router.get('/bookings/create', bookingController.create);
router.post('/bookings', bookingController.store);
router.get('/bookings/:id', bookingController.show);
router.patch('/bookings/:id/approve', bookingController.approve);
router.patch('/bookings/:id/reject', bookingController.reject);
router.patch('/bookings/:id/cancel', bookingController.cancel);

// Withdrawals
router.use('/withdrawals', requirePermission('withdrawals'));
router.get('/withdrawals', withdrawalController.index);
router.get('/withdrawals/:id', withdrawalController.show);
router.patch('/withdrawals/:id/approve', withdrawalController.approve);
router.patch('/withdrawals/:id/reject', withdrawalController.reject);

// Support Tickets
router.use('/tickets', requirePermission('tickets'));
router.get('/tickets', ticketController.index);
router.get('/tickets/:id', ticketController.show);
router.patch('/tickets/:id/reply', ticketController.reply);
router.patch('/tickets/:id/close', ticketController.close);
router.patch('/tickets/:id/reopen', ticketController.reopen);

// Ranks
router.use('/ranks', restrictTo('super_admin'));
router.get('/ranks', rankController.index);
router.get('/ranks/:id', rankController.show);
router.patch('/ranks/:id', rankController.update);

// Audit Logs
router.use('/audit-logs', restrictTo('super_admin'));
router.get('/audit-logs', auditLogController.index);

// Customers
router.use('/customers', requirePermission('customers'));
router.get('/customers', customerController.index);
router.post('/customers', customerController.store);
router.get('/customers/:id', customerController.show);
router.put('/customers/:id', customerController.update);
router.delete('/customers/:id', customerController.destroy);

// Referrals
router.use('/referrals', requirePermission('referrals'));
router.get('/referrals', referralController.index);

// Sub Admins
router.get('/sub-admins', subAdminController.index);
router.get('/sub-admins/:id', subAdminController.show);
router.post('/sub-admins', subAdminController.store);
router.patch('/sub-admins/:id', subAdminController.update);
router.patch('/sub-admins/:id/toggle-status', subAdminController.toggleStatus);

// Reports
router.use('/reports', requirePermission('reports'));
router.get('/reports', reportController.overview);
router.get('/reports/emi-collections', reportController.emiCollections);
router.get('/reports/emi-collections/export', reportController.emiCollectionsExport);
router.get('/reports/commissions', reportController.commissions);
router.get('/reports/commissions/export', reportController.commissionsExport);
router.get('/reports/agent-earnings', reportController.agentEarnings);
router.get('/reports/agent-earnings/export', reportController.agentEarningsExport);
router.get('/reports/project-sales', reportController.projectSales);
router.get('/reports/project-sales/export', reportController.projectSalesExport);
router.get('/reports/payouts', reportController.payouts);
router.get('/reports/payouts/export', reportController.payoutsExport);

// Settings
router.use('/settings', restrictTo('super_admin'));
router.get('/settings', settingsController.index);
router.patch('/settings', settingsUpload.single('site_logo'), settingsController.update);

module.exports = router;
