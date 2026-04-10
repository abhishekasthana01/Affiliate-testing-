const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    resellerId: {
      type: String,
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
    commissionAmount: {
      type: Number,
      required: true,
    },
    commissionBreakdown: {
      type: Object,
      default: undefined,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'rejected'],
      default: 'pending',
    },
    productDetails: {
      id: String,
      name: String,
    },
    customerEmail: {
      type: String,
    },
    paymentId: {
      type: String, // Stripe ID or Beam Transaction ID
    },
    clickId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Click',
    },
    attribution: {
      model: {
        type: String,
        enum: ['last_click'],
        default: 'last_click',
      },
      lookbackDays: {
        type: Number,
        default: 30,
      },
      referralCode: String,
      couponCode: String,
      deviceId: String,
      sessionId: String,
      attributedAt: Date,
      evidence: {
        type: Object,
        default: undefined,
      },
    },
    // Fraud / Risk Scoring
    fraudScore: {
      type: Number, // 0-100
      default: 0,
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    riskFactors: [String], // e.g. ["High Value", "IP Mismatch"]
    
    paidAt: {
      type: Date,
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

transactionSchema.index(
  { paymentId: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
