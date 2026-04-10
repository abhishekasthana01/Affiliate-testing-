const Notification = require('../models/Notification');

const listMyNotifications = async (req, res) => {
  const resellerId = req.user.resellerId;
  const items = await Notification.find({
    recipientType: 'reseller',
    resellerId,
  })
    .sort({ createdAt: -1 })
    .limit(100);
  res.json({ data: items });
};

const markRead = async (req, res) => {
  const resellerId = req.user.resellerId;
  const { id } = req.params;
  const n = await Notification.findOne({
    _id: id,
    recipientType: 'reseller',
    resellerId,
  });
  if (!n) return res.status(404).json({ message: 'Not found' });
  n.readAt = new Date();
  await n.save();
  res.json({ data: n });
};

module.exports = { listMyNotifications, markRead };

