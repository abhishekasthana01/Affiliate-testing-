const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['active', 'paused'], default: 'active', index: true },
    criteria: {
      type: Object,
      default: undefined,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Badge', badgeSchema);

