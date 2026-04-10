const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const Notification = require('../models/Notification');
const { emitToAdmins } = require('../services/realtime');
const { sendEmail } = require('../services/emailService');
const config = require('../config');

// @desc    Register new user
// @route   POST /auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please add all fields' });
  }

  // Check if user exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Create user
  const user = new User({
    name,
    email,
    password,
    role: 'reseller',
    registrationIp: req.ip
  });

  // Generate Signup OTP
  const otp = user.getSignupOTP();
  await user.save();

  // Send OTP via email (production). In dev, we can still return it.
  try {
    await sendEmail({
      to: user.email,
      subject: 'Verify your email',
      text: `Your Beam Affiliate verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
      html: `<p>Your Beam Affiliate verification code is:</p><p><strong style="font-size:18px">${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
    });
  } catch (e) {
    // If email sending fails, keep response generic; dev can still use returned otp when enabled.
    if (config.isProd) {
      console.error('Signup OTP email failed:', e?.message || e);
    }
  }

  // Notify admins (new signup)
  try {
    const n = await Notification.create({
      recipientType: 'admin',
      title: 'New signup',
      message: `${user.email} signed up as ${user.role}`,
      type: 'signup',
      data: { userId: user._id, email: user.email, role: user.role },
    });
    emitToAdmins('notification', { notification: n });
  } catch {
    // ignore notification errors
  }

  // In production, send this OTP via email
  res.status(201).json({
    message: 'User registered. Please verify your email with the OTP sent.',
    ...(config.isProd ? {} : { otp }), // DEV ONLY
    email: user.email
  });
};

// @desc    Verify signup OTP
// @route   POST /auth/verify-signup
// @access  Public
const verifySignupOTP = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Please provide email and OTP' });
  }

  const hashedOTP = require('crypto')
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  const user = await User.findOne({
    email,
    signupOTP: hashedOTP,
    signupOTPExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  user.isVerified = true;
  user.signupOTP = undefined;
  user.signupOTPExpire = undefined;
  await user.save();

  res.status(200).json({
    message: 'Email verified successfully',
    data: {
      token: generateToken(user._id),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        resellerId: user.resellerId,
      }
    }
  });
};

// @desc    Authenticate a user
// @route   POST /auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Check for user email
  const user = await User.findOne({ email }).select('+password');

  if (user && (await user.matchPassword(password))) {
    if (!user.isVerified) {
      return res.status(401).json({ message: 'Please verify your email before logging in' });
    }
    if (user.isActive === false) {
      return res.status(403).json({ message: 'Account is disabled' });
    }

    // Update last login IP
    user.lastLoginIp = req.ip;
    await user.save({ validateBeforeSave: false });

    res.json({
      data: {
        token: generateToken(user._id),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          resellerId: user.resellerId,
        }
      }
    });
  } else {
    res.status(400).json({ message: 'Invalid credentials' });
  }
};

// @desc    Get user data
// @route   GET /auth/me
// @access  Private
const getMe = async (req, res) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      resellerId: user.resellerId,
    }
  });
};

// @desc    Forgot password
// @route   POST /auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return res.status(404).json({ message: 'There is no user with that email' });
  }

  // Get reset OTP
  const otp = user.getResetPasswordOTP();

  await user.save({ validateBeforeSave: false });

  // Send reset OTP via email (production)
  try {
    await sendEmail({
      to: user.email,
      subject: 'Password reset code',
      text: `Your password reset code is: ${otp}\n\nThis code expires in 10 minutes.`,
      html: `<p>Your password reset code is:</p><p><strong style="font-size:18px">${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
    });
  } catch (e) {
    if (config.isProd) {
      console.error('Reset OTP email failed:', e?.message || e);
    }
  }

  // In production, do not return OTP.
  res.status(200).json({
    message: 'If the email exists, a verification code has been sent.',
    ...(config.isProd ? {} : { otp })
  });
};

// @desc    Verify OTP
// @route   POST /auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Please provide email and OTP' });
  }

  // Get hashed OTP
  const hashedOTP = require('crypto')
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  const user = await User.findOne({
    email,
    resetPasswordOTP: hashedOTP,
    resetPasswordOTPExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  res.status(200).json({
    message: 'OTP verified successfully',
    success: true
  });
};

// @desc    Reset password
// @route   PUT /auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  const { email, otp, password } = req.body;

  if (!email || !otp || !password) {
    return res.status(400).json({ message: 'Please provide email, OTP and new password' });
  }

  // Get hashed OTP
  const hashedOTP = require('crypto')
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  const user = await User.findOne({
    email,
    resetPasswordOTP: hashedOTP,
    resetPasswordOTPExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  // Set new password
  user.password = password;
  user.resetPasswordOTP = undefined;
  user.resetPasswordOTPExpire = undefined;
  await user.save();

  res.status(200).json({
    message: 'Password reset successful',
    data: {
      token: generateToken(user._id),
    }
  });
};

module.exports = {
  registerUser,
  verifySignupOTP,
  loginUser,
  getMe,
  forgotPassword,
  verifyOTP,
  resetPassword,
};
