const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['reseller', 'admin'],
      default: 'reseller',
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Optional fine-grained permissions (primarily for admins).
    // Example: ["admin:users:read", "admin:payouts:approve"]
    permissions: {
      type: [String],
      default: undefined,
      index: true,
    },
    resellerId: {
      type: String,
      unique: true,
      sparse: true, // Allows null/undefined to not conflict (though for resellers it should exist)
    },
    // For fraud prevention
    lastLoginIp: String,
    registrationIp: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    signupOTP: String,
    signupOTPExpire: Date,
    resetPasswordOTP: String,
    resetPasswordOTPExpire: Date,
  },
  {
    timestamps: true,
  }
);

// Encrypt password using bcrypt
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Generate Reseller ID if role is reseller
userSchema.pre('save', function () {
  if (this.role === 'reseller' && !this.resellerId) {
    this.resellerId = uuidv4().split('-')[0];
  }
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash signup OTP
userSchema.methods.getSignupOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  this.signupOTP = require('crypto')
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  this.signupOTPExpire = Date.now() + 10 * 60 * 1000;

  return otp;
};

// Generate and hash password OTP
userSchema.methods.getResetPasswordOTP = function () {
  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash OTP and set to resetPasswordOTP field
  this.resetPasswordOTP = require('crypto')
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  // Set expire (e.g., 10 minutes)
  this.resetPasswordOTPExpire = Date.now() + 10 * 60 * 1000;

  return otp;
};

module.exports = mongoose.model('User', userSchema);
