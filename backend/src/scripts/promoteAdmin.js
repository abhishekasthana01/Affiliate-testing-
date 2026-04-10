require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User');

async function main() {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  const superFlag = String(process.argv[3] || '').trim().toLowerCase() === '--super';
  if (!email) {
    console.error('Usage: node src/scripts/promoteAdmin.js <email> [--super]');
    process.exit(2);
  }

  await connectDB();

  const user = await User.findOne({ email }).select('-password');
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        role: 'admin',
        isVerified: true,
        isActive: true,
        ...(superFlag ? { isSuperAdmin: true } : {}),
      },
      $unset: { resellerId: 1 },
    }
  );

  const updated = await User.findById(user._id).lean();

  console.log(`Promoted to admin: ${updated?.email} (id=${updated?._id}) super=${Boolean(updated?.isSuperAdmin)} role=${updated?.role}`);
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});

