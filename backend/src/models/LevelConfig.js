const mongoose = require('mongoose');

const levelConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true }, // e.g. "default"
    levels: {
      type: [
        {
          level: Number,
          name: String,
          minRevenue30d: Number,
          minConversions30d: Number,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LevelConfig', levelConfigSchema);

