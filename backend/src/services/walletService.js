const Wallet = require('../models/Wallet');
const LedgerEntry = require('../models/LedgerEntry');

async function getOrCreateWallet(resellerId, currency = 'USD') {
  const existing = await Wallet.findOne({ resellerId });
  if (existing) return existing;
  return await Wallet.create({ resellerId, currency });
}

async function recordEntry({ resellerId, wallet, type, bucket, amount, currency, reference, note }) {
  return await LedgerEntry.create({
    resellerId,
    walletId: wallet._id,
    type,
    bucket,
    amount,
    currency: currency || wallet.currency,
    reference,
    note,
    balancesAfter: {
      availableBalance: wallet.availableBalance,
      pendingBalance: wallet.pendingBalance,
      lockedBalance: wallet.lockedBalance,
    },
  });
}

async function creditPending({ resellerId, amount, currency, transactionId, refKey }) {
  const wallet = await getOrCreateWallet(resellerId, currency);
  wallet.pendingBalance += amount;
  await wallet.save();
  await recordEntry({
    resellerId,
    wallet,
    type: 'credit',
    bucket: 'pending',
    amount,
    currency,
    reference: { refType: 'transaction', refId: transactionId, refKey: refKey || null },
    note: 'Commission pending',
  });
  return wallet;
}

async function reversePending({ resellerId, amount, currency, transactionId, refKey }) {
  const wallet = await getOrCreateWallet(resellerId, currency);
  wallet.pendingBalance = Math.max(0, wallet.pendingBalance - amount);
  await wallet.save();
  await recordEntry({
    resellerId,
    wallet,
    type: 'debit',
    bucket: 'pending',
    amount,
    currency,
    reference: { refType: 'transaction', refId: transactionId, refKey: refKey || null },
    note: 'Pending commission reversed',
  });
  return wallet;
}

async function movePendingToAvailable({ resellerId, amount, currency, transactionId, refKey }) {
  const wallet = await getOrCreateWallet(resellerId, currency);
  wallet.pendingBalance = Math.max(0, wallet.pendingBalance - amount);
  wallet.availableBalance += amount;
  await wallet.save();
  await recordEntry({
    resellerId,
    wallet,
    type: 'move',
    bucket: 'available',
    amount,
    currency,
    reference: { refType: 'transaction', refId: transactionId, refKey: refKey || null },
    note: 'Commission approved (pending→available)',
  });
  return wallet;
}

async function debitAvailableForPayout({ resellerId, amount, currency, payoutId }) {
  const wallet = await getOrCreateWallet(resellerId, currency);
  if (wallet.availableBalance < amount) {
    const err = new Error('Insufficient available balance');
    err.statusCode = 400;
    throw err;
  }
  wallet.availableBalance -= amount;
  wallet.lockedBalance += amount;
  await wallet.save();
  await recordEntry({
    resellerId,
    wallet,
    type: 'move',
    bucket: 'locked',
    amount,
    currency,
    reference: { refType: 'payout', refId: payoutId, refKey: null },
    note: 'Payout requested (available→locked)',
  });
  return wallet;
}

async function finalizePayoutPaid({ resellerId, amount, currency, payoutId }) {
  const wallet = await getOrCreateWallet(resellerId, currency);
  wallet.lockedBalance = Math.max(0, wallet.lockedBalance - amount);
  await wallet.save();
  await recordEntry({
    resellerId,
    wallet,
    type: 'debit',
    bucket: 'locked',
    amount,
    currency,
    reference: { refType: 'payout', refId: payoutId, refKey: null },
    note: 'Payout paid (locked debited)',
  });
  return wallet;
}

async function releaseLockedOnReject({ resellerId, amount, currency, payoutId }) {
  const wallet = await getOrCreateWallet(resellerId, currency);
  wallet.lockedBalance = Math.max(0, wallet.lockedBalance - amount);
  wallet.availableBalance += amount;
  await wallet.save();
  await recordEntry({
    resellerId,
    wallet,
    type: 'move',
    bucket: 'available',
    amount,
    currency,
    reference: { refType: 'payout', refId: payoutId, refKey: null },
    note: 'Payout rejected (locked→available)',
  });
  return wallet;
}

module.exports = {
  getOrCreateWallet,
  creditPending,
  reversePending,
  movePendingToAvailable,
  debitAvailableForPayout,
  finalizePayoutPaid,
  releaseLockedOnReject,
};

