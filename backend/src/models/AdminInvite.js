const mongoose = require('mongoose');

const adminInviteSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null, index: true },
    role: { type: String, enum: ['admin'], default: 'admin' },
    isSuperAdmin: { type: Boolean, default: false },
    permissions: { type: [String], default: undefined },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

adminInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AdminInvite', adminInviteSchema);

