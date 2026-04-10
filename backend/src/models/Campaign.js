const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Draft', 'Scheduled', 'Sending', 'Sent', 'Failed'],
    default: 'Draft',
  },
  scheduledAt: {
    type: Date,
  },
  sentAt: {
    type: Date,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  segmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Segment',
    default: null,
    index: true,
  },
  // Optional explicit recipients (override segment)
  recipients: {
    type: [String], // emails
    default: undefined,
  },
  recipientsCount: {
    type: Number,
    default: 0,
  },
  stats: {
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    bounced: { type: Number, default: 0 },
  }
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);
