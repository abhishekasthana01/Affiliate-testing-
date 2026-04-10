const Transaction = require('../models/Transaction');
const Payout = require('../models/Payout');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const LedgerEntry = require('../models/LedgerEntry');
const { debitAvailableForPayout } = require('../services/walletService');
const Notification = require('../models/Notification');
const { emitToReseller, emitToAdmins } = require('../services/realtime');

// @desc    Get dashboard data
// @route   GET /reseller/dashboard
const getDashboard = async (req, res) => {
  const resellerId = req.user.resellerId;
  
  // Totals
  const transactions = await Transaction.find({ resellerId });
  
  const earnings = transactions
    .filter(t => t.status !== 'rejected')
    .reduce((acc, t) => acc + t.commissionAmount, 0);
  
  const conversions = transactions.length;
  const clicks = 0; // TODO: Aggregate from Click model if needed, or separate endpoint

  // Recent activity
  const recentTransactions = transactions.slice(0, 5);

  res.json({
    data: {
      totals: {
        earnings,
        conversions,
        clicks: 120, // Mock or fetch real
      },
      transactions: recentTransactions,
      trend: [], // Implement trend aggregation
    }
  });
};

// @desc    Get transactions
// @route   GET /reseller/transactions
const getTransactions = async (req, res) => {
  const transactions = await Transaction.find({ resellerId: req.user.resellerId }).sort({ createdAt: -1 });
  res.json({ data: transactions });
};

// @desc    Get payouts
// @route   GET /reseller/payouts
const getPayouts = async (req, res) => {
  const payouts = await Payout.find({ resellerId: req.user.resellerId }).sort({ createdAt: -1 });
  res.json({ data: payouts });
};

// @desc    Request Payout
// @route   POST /reseller/payouts
const requestPayout = async (req, res) => {
  const { amount, method, destination } = req.body;
  
  const resellerId = req.user.resellerId;
  const wallet = await Wallet.findOne({ resellerId });
  if (!wallet) {
    return res.status(400).json({ message: 'No wallet yet. Earn commissions first.' });
  }
  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ message: 'Invalid amount' });
  }
  
  const payout = await Payout.create({
    resellerId,
    amount: Number(amount),
    method,
    destination,
  });

  // Lock funds (available → locked)
  try {
    await debitAvailableForPayout({
      resellerId,
      amount: Number(amount),
      currency: payout.currency || wallet.currency,
      payoutId: payout._id,
    });
  } catch (e) {
    await Payout.findByIdAndDelete(payout._id);
    return res.status(e.statusCode || 400).json({ message: e.message || 'Payout request failed' });
  }

  // Notify reseller + admins
  try {
    const n = await Notification.create({
      recipientType: 'reseller',
      resellerId,
      title: 'Payout requested',
      message: `Your payout request of ${payout.currency} ${payout.amount.toFixed(2)} was submitted for approval.`,
      type: 'payout',
      data: { payoutId: payout._id, amount: payout.amount },
    });
    emitToReseller(resellerId, 'notification', { notification: n });
  } catch {}
  try {
    const n2 = await Notification.create({
      recipientType: 'admin',
      title: 'New payout request',
      message: `Reseller ${resellerId} requested a payout of ${payout.currency} ${payout.amount.toFixed(2)}.`,
      type: 'payout',
      data: { payoutId: payout._id, resellerId, amount: payout.amount },
    });
    emitToAdmins('notification', { notification: n2 });
  } catch {}
  
  res.status(201).json({ data: payout });
};

// @desc    Get Profile
// @route   GET /reseller/me
const getProfile = async (req, res) => {
  const user = await User.findById(req.user.id);
  const wallet = await Wallet.findOne({ resellerId: user.resellerId });
  res.json({
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      resellerId: user.resellerId,
      wallet: wallet
        ? {
            currency: wallet.currency,
            availableBalance: wallet.availableBalance,
            pendingBalance: wallet.pendingBalance,
            lockedBalance: wallet.lockedBalance,
          }
        : { currency: 'USD', availableBalance: 0, pendingBalance: 0, lockedBalance: 0 },
    }
  });
};

// @desc    Get wallet ledger
// @route   GET /reseller/wallet/ledger
const getWalletLedger = async (req, res) => {
  const resellerId = req.user.resellerId;
  const wallet = await Wallet.findOne({ resellerId });
  if (!wallet) return res.json({ data: { wallet: null, entries: [] } });
  const entries = await LedgerEntry.find({ resellerId }).sort({ createdAt: -1 }).limit(200);
  res.json({
    data: {
      wallet: {
        currency: wallet.currency,
        availableBalance: wallet.availableBalance,
        pendingBalance: wallet.pendingBalance,
        lockedBalance: wallet.lockedBalance,
      },
      entries,
    },
  });
};

// @desc    Update Profile
// @route   PUT /reseller/me
const updateProfile = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (req.body.name) user.name = req.body.name;
  if (req.body.email) user.email = req.body.email;
  
  await user.save();
  res.json({
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      resellerId: user.resellerId,
    }
  });
};

// @desc    Get Settings
// @route   GET /reseller/settings
const getSettings = async (req, res) => {
  res.json({
    data: {
      notifications: true,
      payoutMethod: 'beam_wallet'
    }
  });
};

module.exports = {
  getDashboard,
  getTransactions,
  getPayouts,
  requestPayout,
  getProfile,
  updateProfile,
  getSettings,
  getWalletLedger,
};
