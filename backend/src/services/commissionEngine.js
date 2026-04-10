const Product = require('../models/Product');
const Transaction = require('../models/Transaction');

function tierForMonthlyRevenue(revenue) {
  if (revenue >= 50000) return { tier: 'platinum', bonusRate: 0.05 };
  if (revenue >= 20000) return { tier: 'gold', bonusRate: 0.03 };
  if (revenue >= 5000) return { tier: 'silver', bonusRate: 0.015 };
  return { tier: 'bronze', bonusRate: 0 };
}

async function getRolling30dRevenue(resellerId) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await Transaction.aggregate([
    { $match: { resellerId, createdAt: { $gte: since }, status: { $in: ['approved', 'paid'] } } },
    { $group: { _id: null, revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  return { revenue: rows[0]?.revenue || 0, count: rows[0]?.count || 0 };
}

/**
 * Computes commission with:
 * - product-based base rate (Product.commissionRate)
 * - tier-based bonus rate (based on 30d revenue)
 * - performance bonus (monthly conversion count threshold)
 */
async function computeCommission({ resellerId, amount, productId }) {
  const product = productId ? await Product.findById(productId).lean() : null;
  const baseRatePct = product?.commissionRate ?? 10; // percent
  const baseRate = baseRatePct / 100;

  const rolling = await getRolling30dRevenue(resellerId);
  const tierMeta = tierForMonthlyRevenue(rolling.revenue);

  // Performance bonus: +1% if 30d conversions >= 50
  const perfBonusRate = rolling.count >= 50 ? 0.01 : 0;

  const bonusRate = tierMeta.bonusRate + perfBonusRate;
  const effectiveRate = baseRate + bonusRate;

  const baseAmount = amount * baseRate;
  const bonusAmount = amount * bonusRate;
  const commissionAmount = baseAmount + bonusAmount;

  return {
    commissionAmount,
    breakdown: {
      base: {
        rate: baseRate,
        amount: baseAmount,
        source: product ? 'product_rate' : 'default_rate',
        productRatePct: baseRatePct,
      },
      tier: {
        tier: tierMeta.tier,
        bonusRate: tierMeta.bonusRate,
        amount: amount * tierMeta.bonusRate,
        rolling30dRevenue: rolling.revenue,
      },
      performance: {
        bonusRate: perfBonusRate,
        amount: amount * perfBonusRate,
        rolling30dConversions: rolling.count,
      },
      effectiveRate,
    },
  };
}

module.exports = { computeCommission };

