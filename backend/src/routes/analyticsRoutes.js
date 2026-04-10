const express = require('express');
const router = express.Router();
const { ingestEvent, getAnalyticsStats, getFunnel, getRealtime } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.post('/events', ingestEvent);
router.get('/stats', protect, authorize('admin'), getAnalyticsStats);
router.get('/funnel', protect, authorize('admin'), getFunnel);
router.get('/realtime', protect, authorize('admin'), getRealtime);

module.exports = router;
