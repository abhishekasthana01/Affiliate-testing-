const Transaction = require('../models/Transaction');

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function riskLevel(score) {
  if (score >= 90) return 'critical';
  if (score >= 75) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

/**
 * Basic deterministic risk scoring (extendable).
 * Inputs should be cheap to compute synchronously at conversion time.
 */
async function scoreConversion({ amount, paymentId, customerEmail, winningClick }) {
  let score = 0;
  const factors = [];

  if (amount >= 5000) {
    score += 20;
    factors.push('high_value');
  } else if (amount >= 1000) {
    score += 10;
    factors.push('mid_value');
  }

  if (winningClick?.isSuspicious) {
    score += 25;
    factors.push(...(winningClick.suspicionReasons?.length ? winningClick.suspicionReasons : ['suspicious_click']));
  }

  // Duplicate paymentId/customerEmail checks (last 24h).
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (paymentId) {
    const dupPid = await Transaction.countDocuments({ paymentId, createdAt: { $gte: since } });
    if (dupPid > 0) {
      score += 60;
      factors.push('duplicate_payment_id');
    }
  }
  if (customerEmail) {
    const dupEmail = await Transaction.countDocuments({ customerEmail, createdAt: { $gte: since } });
    if (dupEmail >= 3) {
      score += 20;
      factors.push('repeat_customer_email');
    }
  }

  score = clamp(score, 0, 100);
  return { fraudScore: score, riskLevel: riskLevel(score), riskFactors: factors };
}

module.exports = { scoreConversion };

