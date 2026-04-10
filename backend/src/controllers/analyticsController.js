const Event = require('../models/Event');
const Transaction = require('../models/Transaction');

function rangeToPast(range) {
  const now = new Date();
  const past = new Date();
  if (range === '1d') past.setDate(now.getDate() - 1);
  else if (range === '7d') past.setDate(now.getDate() - 7);
  else if (range === '90d') past.setDate(now.getDate() - 90);
  else past.setDate(now.getDate() - 30);
  return { now, past };
}

// @desc    Ingest raw event (clickstream)
// @route   POST /api/analytics/events
// @access  Public (or with public API key)
const ingestEvent = async (req, res) => {
  const { type, resellerId, sessionId, deviceId, referralCode, couponCode, userId, metadata, url } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  // Async processing (fire and forget for response speed, or queue)
  // For MVP, we save directly
  try {
    await Event.create({
      type,
      resellerId,
      sessionId,
      deviceId,
      referralCode,
      couponCode,
      userId,
      metadata,
      url,
      ipAddress,
      userAgent
    });
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    // Don't block client on analytics error
    console.error('Event ingestion error:', error);
    res.status(200).json({ status: 'queued' }); 
  }
};

// @desc    Get aggregated analytics
// @route   GET /api/analytics/stats
// @access  Private (Admin)
const getAnalyticsStats = async (req, res) => {
  const { range = '30d' } = req.query;
  const { past } = rangeToPast(range);

  // Aggregation Pipeline for Transactions
  const revenueStats = await Transaction.aggregate([
    { $match: { createdAt: { $gte: past }, status: 'paid' } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        totalRevenue: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Aggregation Pipeline for Events
  const eventStats = await Event.aggregate([
    { $match: { createdAt: { $gte: past } } },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 }
      }
    }
  ]);

  res.json({
    range,
    revenueTrend: revenueStats,
    eventBreakdown: eventStats
  });
};

// @desc    Funnel analytics (click->signup->checkout->purchase)
// @route   GET /api/analytics/funnel
// @access  Private (Admin)
const getFunnel = async (req, res) => {
  const { range = '30d' } = req.query;
  const { past } = rangeToPast(range);

  const steps = [
    { key: 'click', types: ['click'] },
    { key: 'landing_view', types: ['landing_view', 'view'] },
    { key: 'signup', types: ['signup'] },
    { key: 'checkout_start', types: ['checkout_start'] },
    { key: 'purchase', types: ['purchase'] },
  ];

  // Per-step unique sessions (simple + fast). Extend later to path-based funnels.
  const counts = {};
  for (const step of steps) {
    const rows = await Event.aggregate([
      { $match: { createdAt: { $gte: past }, type: { $in: step.types } } },
      { $group: { _id: '$sessionId' } },
      { $count: 'count' },
    ]);
    counts[step.key] = rows[0]?.count || 0;
  }

  res.json({
    data: {
      range,
      steps: steps.map((s) => ({ step: s.key, sessions: counts[s.key] })),
    },
  });
};

// @desc    Near-real-time pulses (last N minutes)
// @route   GET /api/analytics/realtime
// @access  Private (Admin)
const getRealtime = async (req, res) => {
  const minutes = Math.max(1, Math.min(60, Number(req.query.minutes || 10)));
  const since = new Date(Date.now() - minutes * 60 * 1000);

  const [events, conversions] = await Promise.all([
    Event.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Transaction.countDocuments({ createdAt: { $gte: since } }),
  ]);

  res.json({ data: { minutes, events, conversions } });
};

module.exports = {
  ingestEvent,
  getAnalyticsStats,
  getFunnel,
  getRealtime,
};
