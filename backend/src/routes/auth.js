const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  registerUser,
  verifySignupOTP,
  loginUser,
  getMe,
  forgotPassword,
  verifyOTP,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.post(
  '/signup',
  [
    body('name').isString().trim().isLength({ min: 1 }).withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    // role is not accepted from public signup in production
  ],
  validate,
  registerUser
);
router.post(
  '/verify-signup',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('otp').isString().trim().isLength({ min: 4 }).withMessage('OTP is required'),
  ],
  validate,
  verifySignupOTP
);
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isString().isLength({ min: 1 }).withMessage('Password is required'),
  ],
  validate,
  loginUser
);
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail().withMessage('Valid email is required')],
  validate,
  forgotPassword
);
router.post(
  '/verify-otp',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('otp').isString().trim().isLength({ min: 4 }).withMessage('OTP is required'),
  ],
  validate,
  verifyOTP
);
router.put(
  '/reset-password',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('otp').isString().trim().isLength({ min: 4 }).withMessage('OTP is required'),
    body('password').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  resetPassword
);
router.get('/me', protect, getMe);

module.exports = router;
