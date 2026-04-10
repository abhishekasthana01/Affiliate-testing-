const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema(
  {
    resellerId: {
      type: String,
      required: true,
      index: true,
    },
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit', 'move'],
      required: true,
      index: true,
    },
    bucket: {
      // which balance bucket was affected
      type: String,
      enum: ['pending', 'available', 'locked'],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    reference: {
      refType: {
        type: String,
        enum: ['transaction', 'payout', 'adjustment'],
        required: true,
      },
      refId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
      },
      refKey: {
        type: String,
        default: null,
      },
    },
    note: String,
    balancesAfter: {
      availableBalance: Number,
      pendingBalance: Number,
      lockedBalance: Number,
    },
  },
  { timestamps: true }
);

ledgerEntrySchema.index(
  { resellerId: 1, 'reference.refType': 1, 'reference.refId': 1, type: 1, bucket: 1 },
  { sparse: true }
);

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);

