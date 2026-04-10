const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const {
  getDashboard,
  getTransactions,
  getPayouts,
  requestPayout,
  getProfile,
  updateProfile,
  getSettings,
  getWalletLedger,
} = require('../controllers/dashboardController');
const {
  listReferralLinks,
  createReferralLink,
  updateReferralLink,
  deleteReferralLink,
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} = require('../controllers/affiliateToolsController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(protect); // All routes protected

router.get('/dashboard', getDashboard);
router.get('/transactions', getTransactions);
router.get('/payouts', getPayouts);
router.post(
  '/payouts',
  [
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be > 0'),
    body('method').optional().isString().trim(),
    body('destination').optional().isString().trim(),
  ],
  validate,
  requestPayout
);
router.get('/me', getProfile);
router.put('/me', updateProfile);
router.get('/settings', getSettings);
router.get('/wallet/ledger', getWalletLedger);

// Affiliate tools (referral links & coupons)
router.get('/referral-links', listReferralLinks);
router.post(
  '/referral-links',
  [
    body('name').optional().isString().trim(),
    body('code').optional().isString().trim().isLength({ min: 4, max: 32 }),
    body('productId').optional().isString().trim(),
    body('campaignId').optional().isString().trim(),
  ],
  validate,
  createReferralLink
);
router.put(
  '/referral-links/:id',
  [
    param('id').isString().trim(),
    body('name').optional().isString().trim(),
    body('status').optional().isIn(['active', 'paused']),
    body('productId').optional().isString().trim(),
    body('campaignId').optional().isString().trim(),
  ],
  validate,
  updateReferralLink
);
router.delete(
  '/referral-links/:id',
  [param('id').isString().trim()],
  validate,
  deleteReferralLink
);

router.get('/coupons', listCoupons);
router.post(
  '/coupons',
  [
    body('name').optional().isString().trim(),
    body('code').optional().isString().trim().isLength({ min: 3, max: 32 }),
    body('discountType').optional().isIn(['percent', 'fixed']),
    body('discountValue').optional().isFloat({ min: 0 }),
    body('validFrom').optional().isISO8601(),
    body('validTo').optional().isISO8601(),
    body('maxRedemptions').optional().isInt({ min: 1 }),
    body('productId').optional().isString().trim(),
    body('campaignId').optional().isString().trim(),
  ],
  validate,
  createCoupon
);
router.put(
  '/coupons/:id',
  [
    param('id').isString().trim(),
    body('name').optional().isString().trim(),
    body('status').optional().isIn(['active', 'paused', 'expired']),
    body('discountType').optional().isIn(['percent', 'fixed']),
    body('discountValue').optional().isFloat({ min: 0 }),
    body('validFrom').optional().isISO8601(),
    body('validTo').optional().isISO8601(),
    body('maxRedemptions').optional().isInt({ min: 1 }),
    body('productId').optional().isString().trim(),
    body('campaignId').optional().isString().trim(),
  ],
  validate,
  updateCoupon
);
router.delete('/coupons/:id', [param('id').isString().trim()], validate, deleteCoupon);

module.exports = router;
