const Badge = require('../models/Badge');
const UserBadge = require('../models/UserBadge');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

async function ensureDefaultBadges() {
  const defaults = [
    { key: 'first_conversion', name: 'First Conversion', description: 'Earned your first conversion.' },
    { key: 'revenue_5k', name: '5K Revenue', description: 'Generated 5,000 in revenue (rolling 30d).' },
    { key: 'revenue_20k', name: '20K Revenue', description: 'Generated 20,000 in revenue (rolling 30d).' },
    { key: 'conversions_50', name: '50 Conversions', description: 'Reached 50 conversions (rolling 30d).' },
  ];
  for (const b of defaults) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await Badge.exists({ key: b.key });
    if (!exists) {
      // eslint-disable-next-line no-await-in-loop
      await Badge.create({ ...b, status: 'active' });
    }
  }
}

async function rolling30dStats(resellerId) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await Transaction.aggregate([
    { $match: { resellerId, createdAt: { $gte: since }, status: { $in: ['approved', 'paid'] } } },
    { $group: { _id: null, revenue: { $sum: '$amount' }, conversions: { $sum: 1 } } },
  ]);
  return { revenue: rows[0]?.revenue || 0, conversions: rows[0]?.conversions || 0 };
}

async function awardBadge({ userId, resellerId, badgeKey, metadata }) {
  try {
    await UserBadge.create({ userId, resellerId, badgeKey, metadata });
    return true;
  } catch {
    return false; // already has it
  }
}

async function onTransactionApproved(transaction) {
  await ensureDefaultBadges();
  const user = await User.findOne({ resellerId: transaction.resellerId }).lean();
  if (!user) return;

  // First conversion badge
  const approvedCount = await Transaction.countDocuments({
    resellerId: transaction.resellerId,
    status: { $in: ['approved', 'paid'] },
  });
  if (approvedCount === 1) {
    await awardBadge({ userId: user._id, resellerId: transaction.resellerId, badgeKey: 'first_conversion' });
  }

  const stats = await rolling30dStats(transaction.resellerId);
  if (stats.revenue >= 5000) {
    await awardBadge({ userId: user._id, resellerId: transaction.resellerId, badgeKey: 'revenue_5k', metadata: stats });
  }
  if (stats.revenue >= 20000) {
    await awardBadge({ userId: user._id, resellerId: transaction.resellerId, badgeKey: 'revenue_20k', metadata: stats });
  }
  if (stats.conversions >= 50) {
    await awardBadge({ userId: user._id, resellerId: transaction.resellerId, badgeKey: 'conversions_50', metadata: stats });
  }
}

module.exports = { onTransactionApproved };

