const express = require('express');
const router = express.Router();
const { protect, authorize, requireSuperAdmin } = require('../middleware/auth');
const {
  getAdminDashboard,
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllTransactions,
  updateTransaction,
  getAllPayouts,
  processPayout,
  getAffiliateStats,
  getAdvancedAnalytics,
  getCampaigns,
  createCampaignAdmin,
  updateCampaign,
  listSegments,
  createSegment,
  updateSegment,
  deleteSegment,
  getLeaderboard,
  getFraudAnalysis,
  reviewFraudTransaction,
  getAuditLogs,
  getSystemSettings,
  updateSystemSettings
} = require('../controllers/adminController');
const { listInvites, createInvite, revokeInvite } = require('../controllers/adminInviteController');

router.use(protect, authorize('admin'));

router.get('/dashboard', getAdminDashboard);
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.patch('/users/:id/toggle-status', toggleUserStatus);
router.delete('/users/:id', deleteUser);

router.get('/products', getAllProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

router.get('/transactions', getAllTransactions);
router.put('/transactions/:id', updateTransaction);

router.get('/payouts', getAllPayouts);
router.put('/payouts/:id/process', processPayout);

router.get('/affiliates', getAffiliateStats);
router.get('/analytics', getAdvancedAnalytics);

router.get('/campaigns', getCampaigns);
router.post('/campaigns', createCampaignAdmin);
router.put('/campaigns', updateCampaign);

router.get('/segments', listSegments);
router.post('/segments', createSegment);
router.put('/segments/:id', updateSegment);
router.delete('/segments/:id', deleteSegment);

router.get('/leaderboard', getLeaderboard);

router.get('/fraud', getFraudAnalysis);
router.put('/fraud/review', reviewFraudTransaction);

router.get('/audit-logs', getAuditLogs);

router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);

// Superadmin-only: invite other admins
router.get('/admin-invites', requireSuperAdmin(), listInvites);
router.post('/admin-invites', requireSuperAdmin(), createInvite);
router.delete('/admin-invites/:id', requireSuperAdmin(), revokeInvite);

module.exports = router;
