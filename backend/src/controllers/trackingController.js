const Click = require('../models/Click');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const ReferralLink = require('../models/ReferralLink');
const Coupon = require('../models/Coupon');
const { computeCommission } = require('../services/commissionEngine');
const { creditPending } = require('../services/walletService');
const { scoreConversion } = require('../services/fraudScoring');

// @desc    Track a click
// @route   POST /api/tracking/click
// @access  Public
const trackClick = async (req, res) => {
  const {
    resellerId: resellerIdInput,
    referralCode,
    couponCode,
    productId,
    sessionId,
    deviceId,
    landingUrl,
    referrer,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
  } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  let resellerId = resellerIdInput;

  if (!resellerId && referralCode) {
    const link = await ReferralLink.findOne({ code: referralCode, status: 'active' }).lean();
    if (!link) {
      return res.status(404).json({ message: 'Invalid referral code' });
    }
    resellerId = link.resellerId;
  }

  if (couponCode) {
    const c = await Coupon.findOne({ code: couponCode, status: 'active' }).lean();
    if (!c) {
      return res.status(404).json({ message: 'Invalid coupon code' });
    }
    // If this is an affiliate coupon, it explicitly attributes to that affiliate.
    if (c.resellerId) resellerId = c.resellerId;
  }

  if (!resellerId) {
    return res.status(400).json({ message: 'resellerId or referralCode required' });
  }

  // Verify reseller exists (optional, helps prevent spam)
  const reseller = await User.findOne({ resellerId });
  if (!reseller) {
    return res.status(404).json({ message: 'Invalid Reseller ID' });
  }

  // Lightweight duplicate click detection (signal only; not blocking).
  const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
  const duplicateCount = await Click.countDocuments({
    resellerId,
    ipAddress,
    ...(deviceId ? { deviceId } : {}),
    createdAt: { $gte: tenSecondsAgo },
  });
  const isSuspicious = duplicateCount > 0;
  const suspicionReasons = isSuspicious ? ['duplicate_click_burst'] : [];
  
  const click = await Click.create({
    resellerId,
    referralCode: referralCode || null,
    couponCode: couponCode || null,
    productId,
    sessionId: sessionId || null,
    deviceId: deviceId || null,
    landingUrl: landingUrl || null,
    referrer: referrer || null,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    ipAddress,
    userAgent,
    isSuspicious,
    suspicionReasons,
  });

  res.status(201).json(click);
};

// @desc    Record a conversion/transaction
// @route   POST /api/tracking/conversion
// @access  Private (Internal/Admin or Payment Webhook)
const recordConversion = async (req, res) => {
  const { 
    resellerId, 
    amount, 
    currency, 
    productId, 
    productName, 
    paymentId, 
    customerEmail,
    couponCode,
    referralCode,
    deviceId,
    sessionId,
  } = req.body;

  if (!resellerId || !amount) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Idempotency: prevent double-crediting on retries/webhooks
  if (paymentId) {
    const existing = await Transaction.findOne({ paymentId });
    if (existing) {
      return res.status(200).json(existing);
    }
  }

  // Coupon can override attribution reseller (affiliate coupon).
  let attributedResellerId = resellerId;
  if (couponCode) {
    const c = await Coupon.findOne({ code: couponCode, status: 'active' }).lean();
    if (c?.resellerId) attributedResellerId = c.resellerId;
  }

  // Find most recent eligible click for attribution.
  const lookbackDays = 30;
  const lookbackStart = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
  const clickQuery = {
    resellerId: attributedResellerId,
    createdAt: { $gte: lookbackStart },
    ...(deviceId ? { deviceId } : {}),
    ...(sessionId ? { sessionId } : {}),
    ...(productId ? { $or: [{ productId }, { productId: { $exists: false } }, { productId: null }] } : {}),
  };
  const winningClick = await Click.findOne(clickQuery).sort({ createdAt: -1 });

  // Calculate commission (product-based + tier/bonus)
  const { commissionAmount, breakdown } = await computeCommission({
    resellerId: attributedResellerId,
    amount,
    productId: productId || undefined,
  });

  const risk = await scoreConversion({
    amount,
    paymentId,
    customerEmail,
    winningClick,
  });

  // Create Transaction
  const transaction = await Transaction.create({
    resellerId: attributedResellerId,
    amount,
    currency,
    commissionAmount,
    commissionBreakdown: breakdown,
    status: 'pending', // Pending validation
    productDetails: {
      id: productId,
      name: productName,
    },
    paymentId,
    customerEmail,
    clickId: winningClick?._id,
    fraudScore: risk.fraudScore,
    riskLevel: risk.riskLevel,
    riskFactors: risk.riskFactors,
    attribution: {
      model: 'last_click',
      lookbackDays,
      referralCode: referralCode || winningClick?.referralCode || undefined,
      couponCode: couponCode || winningClick?.couponCode || undefined,
      deviceId: deviceId || winningClick?.deviceId || undefined,
      sessionId: sessionId || winningClick?.sessionId || undefined,
      attributedAt: new Date(),
      evidence: {
        clickId: winningClick?._id,
        clickCreatedAt: winningClick?.createdAt,
        match: {
          deviceId: Boolean(deviceId),
          sessionId: Boolean(sessionId),
        },
      },
    },
  });

  // Credit pending wallet balance immediately (approval moves it to available).
  // Idempotency is enforced by paymentId; transactionId is unique.
  await creditPending({
    resellerId: attributedResellerId,
    amount: commissionAmount,
    currency: currency || 'USD',
    transactionId: transaction._id,
    refKey: paymentId || null,
  });

  if (winningClick) {
    winningClick.converted = true;
    winningClick.transactionId = transaction._id;
    await winningClick.save();
  }

  res.status(201).json(transaction);
};

// @desc    Get dashboard stats for reseller
// @route   GET /api/tracking/dashboard
// @access  Private (Reseller)
const getDashboardStats = async (req, res) => {
  const resellerId = req.user.resellerId;

  if (!resellerId) {
    return res.status(400).json({ message: 'User is not a reseller' });
  }

  // Parallel queries
  const [clicks, transactions] = await Promise.all([
    Click.countDocuments({ resellerId }),
    Transaction.find({ resellerId }).sort({ createdAt: -1 }),
  ]);

  const totalEarnings = transactions
    .filter(t => t.status !== 'rejected')
    .reduce((acc, t) => acc + t.commissionAmount, 0);
  
  const conversions = transactions.length;

  // Simple trend data (mocking real aggregation for brevity, or doing simple JS grouping)
  // Real app should use MongoDB aggregation
  
  res.json({
    totals: {
      clicks,
      conversions,
      earnings: totalEarnings,
    },
    transactions: transactions.slice(0, 5), // Recent 5
  });
};

module.exports = {
  trackClick,
  recordConversion,
  getDashboardStats,
};
