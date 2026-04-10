const mongoose = require('mongoose');

const segmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'paused'],
      default: 'active',
      index: true,
    },
    // Stored as a safe subset of filters we support (not arbitrary Mongo query).
    filters: {
      roles: { type: [String], default: ['reseller'] },
      isActive: { type: Boolean, default: true },
      createdAfter: Date,
      createdBefore: Date,
      resellerIds: { type: [String], default: undefined }, // explicit allowlist
      emails: { type: [String], default: undefined }, // explicit allowlist
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

module.exports = mongoose.model('Segment', segmentSchema);

