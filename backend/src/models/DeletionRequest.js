const mongoose = require('mongoose');

const deletionRequestSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, index: true },
    otp: { type: String, required: true }, // store hashed in future; plain for now (MVP)
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

deletionRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('DeletionRequest', deletionRequestSchema);

