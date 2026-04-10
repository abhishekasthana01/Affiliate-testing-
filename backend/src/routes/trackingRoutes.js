const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  trackClick,
  recordConversion,
  getDashboardStats,
} = require('../controllers/trackingController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.post(
  '/click',
  [
    body('resellerId')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Invalid resellerId'),
    body('referralCode')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 3 })
      .withMessage('Invalid referralCode'),
    body().custom((value) => {
      // require at least one: resellerId or referralCode
      if (!value?.resellerId && !value?.referralCode) {
        throw new Error('resellerId or referralCode required');
      }
      return true;
    }),
    body('productId').optional().isString().trim(),
    body('couponCode').optional().isString().trim(),
    body('sessionId').optional().isString().trim(),
    body('deviceId').optional().isString().trim(),
    body('landingUrl').optional().isString().trim(),
    body('referrer').optional().isString().trim(),
    body('utmSource').optional().isString().trim(),
    body('utmMedium').optional().isString().trim(),
    body('utmCampaign').optional().isString().trim(),
    body('utmContent').optional().isString().trim(),
    body('utmTerm').optional().isString().trim(),
  ],
  validate,
  trackClick
);
router.post(
  '/conversion',
  protect,
  [
    body('resellerId').isString().trim().isLength({ min: 1 }).withMessage('Reseller ID required'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be > 0'),
    body('currency').optional().isString().trim().isLength({ min: 3, max: 5 }),
    body('productId').optional().isString().trim(),
    body('productName').optional().isString().trim(),
    body('paymentId').optional().isString().trim(),
    body('customerEmail').optional().isEmail().normalizeEmail(),
    body('couponCode').optional().isString().trim(),
    body('referralCode').optional().isString().trim(),
    body('deviceId').optional().isString().trim(),
    body('sessionId').optional().isString().trim(),
  ],
  validate,
  recordConversion
); // Should be protected or have API Key
router.get('/dashboard', protect, getDashboardStats);

module.exports = router;
