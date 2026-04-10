const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { v4: uuidv4 } = require('uuid');
const DeletionRequest = require('../models/DeletionRequest');
const Transaction = require('../models/Transaction');
const Payout = require('../models/Payout');
const Click = require('../models/Click');

// @desc    Request data deletion (Public)
// @route   POST /privacy/deletion-request
const requestDeletion = async (req, res) => {
  const { email } = req.body;
  
  const user = await User.findOne({ email });
  if (!user) {
    // Return success to avoid user enumeration
    return res.json({ message: 'If the email exists, a verification code has been sent.' });
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await DeletionRequest.create({ token, email, otp, expiresAt });

  // Log audit
  await AuditLog.create({
    userId: user._id,
    action: 'DELETION_REQUESTED',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // TODO: Send email
  console.log(`[MOCK EMAIL] To: ${email}, OTP: ${otp}, Token: ${token}`);

  res.json({ message: 'Verification code sent.', token }); // Return token to client to use in next step
};

// @desc    Confirm deletion
// @route   POST /privacy/confirm-deletion
const confirmDeletion = async (req, res) => {
  const { token, otp } = req.body;

  const record = await DeletionRequest.findOne({ token });
  if (!record || record.usedAt || record.otp !== otp || record.expiresAt.getTime() < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired code' });
  }

  const user = await User.findOne({ email: record.email });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Soft delete or anonymize
  user.isActive = false;
  user.name = 'Deleted User';
  user.email = `deleted_${user._id}@deleted.com`;
  user.resellerId = undefined;
  await user.save();

  await AuditLog.create({
    userId: user._id,
    action: 'ACCOUNT_DELETED',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  record.usedAt = new Date();
  await record.save();

  res.json({ message: 'Account deleted successfully.' });
};

// @desc    Export my data (authenticated)
// @route   GET /privacy/export
const exportMyData = async (req, res) => {
  const user = await User.findById(req.user.id).select('-password -signupOTP -signupOTPExpire -resetPasswordOTP -resetPasswordOTPExpire');
  if (!user) return res.status(404).json({ message: 'User not found' });

  const resellerId = user.resellerId;
  const [transactions, payouts, clicks] = await Promise.all([
    resellerId ? Transaction.find({ resellerId }).lean() : [],
    resellerId ? Payout.find({ resellerId }).lean() : [],
    resellerId ? Click.find({ resellerId }).lean() : [],
  ]);

  res.json({
    data: {
      user,
      reseller: resellerId
        ? { resellerId, transactions, payouts, clicks }
        : null,
    },
  });
};

module.exports = {
  requestDeletion,
  confirmDeletion,
  exportMyData,
};
