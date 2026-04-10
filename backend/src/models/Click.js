const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema(
  {
    resellerId: {
      type: String,
      required: true,
      index: true,
    },
    referralCode: {
      type: String,
      default: null,
      index: true,
    },
    couponCode: {
      type: String,
      default: null,
      index: true,
    },
    productId: {
      type: String,
      required: false,
      index: true,
    },
    sessionId: {
      type: String,
      default: null,
      index: true,
    },
    deviceId: {
      type: String,
      default: null,
      index: true,
    },
    landingUrl: {
      type: String,
      default: null,
    },
    referrer: {
      type: String,
      default: null,
    },
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    utmContent: String,
    utmTerm: String,
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
    },
    isSuspicious: {
      type: Boolean,
      default: false,
      index: true,
    },
    suspicionReasons: [String],
    converted: {
      type: Boolean,
      default: false,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Click', clickSchema);
