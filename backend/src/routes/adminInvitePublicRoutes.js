const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { acceptInvite } = require('../controllers/adminInviteController');

router.post(
  '/accept',
  [
    body('token').isString().trim().isLength({ min: 10 }).withMessage('Token is required'),
    body('password').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').optional().isString().trim(),
  ],
  validate,
  acceptInvite
);

module.exports = router;

