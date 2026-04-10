const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      minlength: 3,
      maxlength: 32,
    },
    resellerId: {
      // If set, coupon attributes to that reseller (affiliate coupon).
      type: String,
      default: null,
      index: true,
    },
    name: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'expired'],
      default: 'active',
      index: true,
    },
    discountType: {
      type: String,
      enum: ['percent', 'fixed'],
      default: 'percent',
    },
    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    validFrom: Date,
    validTo: Date,
    maxRedemptions: {
      type: Number,
      default: null,
      min: 1,
    },
    redemptions: {
      type: Number,
      default: 0,
      min: 0,
    },
    productId: {
      type: String,
      default: null,
      index: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);

