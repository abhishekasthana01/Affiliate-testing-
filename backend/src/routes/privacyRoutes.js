const express = require('express');
const router = express.Router();
const {
  requestDeletion,
  confirmDeletion,
  exportMyData,
} = require('../controllers/privacyController');
const { protect } = require('../middleware/auth');

router.post('/deletion-request', requestDeletion);
router.post('/confirm-deletion', confirmDeletion);
router.get('/export', protect, exportMyData);

module.exports = router;
