const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientType: {
      type: String,
      enum: ['reseller', 'admin'],
      required: true,
      index: true,
    },
    resellerId: {
      type: String,
      default: null,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['signup', 'commission', 'payout', 'system'],
      default: 'system',
      index: true,
    },
    data: { type: Object, default: undefined },
    readAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);

