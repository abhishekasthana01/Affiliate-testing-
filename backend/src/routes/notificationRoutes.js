const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { listMyNotifications, markRead } = require('../controllers/notificationController');

router.use(protect);
router.get('/', listMyNotifications);
router.put('/:id/read', markRead);

module.exports = router;

