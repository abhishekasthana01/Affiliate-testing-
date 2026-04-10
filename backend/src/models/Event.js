const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  type: {
    type: String, // 'view', 'click', 'add_to_cart', 'purchase', 'custom'
    required: true,
    index: true,
  },
  resellerId: {
    type: String,
    index: true,
  },
  sessionId: {
    type: String,
    index: true,
  },
  deviceId: {
    type: String,
    index: true,
  },
  referralCode: {
    type: String,
    index: true,
  },
  couponCode: {
    type: String,
    index: true,
  },
  // Optional link to a user (if known)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  url: String,
  ipAddress: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true, // For time-series queries
  }
}, { 
  timestamps: true,
  // If using MongoDB 5.0+, we could use timeseries collections
  // timeseries: {
  //   timeField: 'timestamp',
  //   metaField: 'type',
  //   granularity: 'seconds'
  // }
});

module.exports = mongoose.model('Event', eventSchema);
