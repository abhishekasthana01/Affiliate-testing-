const mongoose = require('mongoose');

const referralLinkSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      minlength: 4,
      maxlength: 32,
    },
    resellerId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'paused'],
      default: 'active',
      index: true,
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
    metadata: {
      type: Object,
      default: undefined,
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

module.exports = mongoose.model('ReferralLink', referralLinkSchema);

