const mongoose = require('mongoose');

const userBadgeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    resellerId: { type: String, required: true, index: true },
    badgeKey: { type: String, required: true, index: true },
    awardedAt: { type: Date, default: Date.now, index: true },
    metadata: { type: Object, default: undefined },
  },
  { timestamps: true }
);

userBadgeSchema.index({ userId: 1, badgeKey: 1 }, { unique: true });

module.exports = mongoose.model('UserBadge', userBadgeSchema);

