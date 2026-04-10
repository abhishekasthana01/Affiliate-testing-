const User = require('../models/User');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Payout = require('../models/Payout');
const Click = require('../models/Click');
const Campaign = require('../models/Campaign');
const AuditLog = require('../models/AuditLog');
const Wallet = require('../models/Wallet');
const { movePendingToAvailable, reversePending, finalizePayoutPaid, releaseLockedOnReject } = require('../services/walletService');
const Segment = require('../models/Segment');
const { onTransactionApproved } = require('../services/gamificationService');
const Notification = require('../models/Notification');
const { emitToReseller, emitToAdmins } = require('../services/realtime');

const logAction = async (req, action, details) => {
  try {
    await AuditLog.create({
      userId: req.user?.id,
      action,
      details,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

const getAdminDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalResellers,
      totalProducts,
      totalTransactions,
      pendingPayouts,
      recentTransactions,
      recentUsers,
      topAffiliates,
      monthlyRevenue
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'reseller' }),
      Product.countDocuments(),
      Transaction.countDocuments(),
      Payout.countDocuments({ status: 'requested' }),
      Transaction.find().sort({ createdAt: -1 }).limit(10),
      User.find().sort({ createdAt: -1 }).limit(5),
      User.aggregate([
        { $match: { role: 'reseller' } },
        {
          $lookup: {
            from: 'transactions',
            localField: 'resellerId',
            foreignField: 'resellerId',
            as: 'transactions'
          }
        },
        {
          $project: {
            name: 1,
            email: 1,
            resellerId: 1,
            totalEarnings: { $sum: '$transactions.commissionAmount' },
            totalConversions: { $size: '$transactions' }
          }
        },
        { $sort: { totalEarnings: -1 } },
        { $limit: 5 }
      ]),
      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(new Date().setDate(1)) },
            status: 'paid'
          }
        },
        { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
      ])
    ]);

    const totalRevenue = monthlyRevenue[0]?.total || 0;

    res.json({
      data: {
        overview: {
          totalUsers,
          totalResellers,
          totalProducts,
          totalTransactions,
          pendingPayouts,
          totalRevenue
        },
        recentTransactions,
        recentUsers,
        topAffiliates,
        chartData: {
          revenue: await getRevenueChart(),
          conversions: await getConversionChart(),
          traffic: await getTrafficChart()
        }
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getRevenueChart = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return Transaction.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo }, status: 'paid' } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$amount' },
        commission: { $sum: '$commissionAmount' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

const getConversionChart = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const clicks = await Click.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
  const conversions = await Transaction.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
  
  return {
    clicks,
    conversions,
    rate: clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) : 0
  };
};

const getTrafficChart = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return Click.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        clicks: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;
    
    const query = {};
    if (role) query.role = role;
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (status === 'unverified') query.isVerified = false;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { resellerId: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password -signupOTP -signupOTPExpire -resetPasswordOTP -resetPasswordOTPExpire')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -signupOTP -signupOTPExpire -resetPasswordOTP -resetPasswordOTPExpire');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [userTransactions, userPayouts, userClicks] = await Promise.all([
      Transaction.find({ resellerId: user.resellerId }),
      Payout.find({ resellerId: user.resellerId }),
      Click.find({ resellerId: user.resellerId })
    ]);

    res.json({
      data: {
        user,
        stats: {
          totalEarnings: userTransactions.reduce((sum, t) => sum + t.commissionAmount, 0),
          totalConversions: userTransactions.length,
          pendingPayouts: userPayouts.filter(p => p.status === 'requested').reduce((sum, p) => sum + p.amount, 0),
          totalClicks: userClicks.length,
          conversionRate: userClicks.length > 0 ? ((userTransactions.length / userClicks.length) * 100).toFixed(2) : 0
        },
        transactions: userTransactions.slice(0, 10),
        recentPayouts: userPayouts.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;

    await user.save();
    
    await logAction(req, 'USER_UPDATED', { userId: user._id, changes: req.body });

    res.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();
    
    await logAction(req, user.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', { userId: user._id });

    res.json({
      data: { id: user._id, isActive: user.isActive },
      message: user.isActive ? 'User activated' : 'User deactivated'
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(req.params.id);
    await Transaction.deleteMany({ resellerId: user.resellerId });
    await Payout.deleteMany({ resellerId: user.resellerId });
    await Click.deleteMany({ resellerId: user.resellerId });
    
    await logAction(req, 'USER_DELETED', { userId: req.params.id, email: user.email });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.categories = category;

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);
    const categories = await Product.distinct('categories');

    res.json({
      data: {
        products,
        categories,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, description, price, currency, categories, longDescription, commissionRate } = req.body;

    const product = new Product({
      name,
      description,
      price,
      currency: currency || 'EUR',
      categories: categories || [],
      longDescription,
      commissionRate: commissionRate || 10
    });

    await product.save();
    
    await logAction(req, 'PRODUCT_CREATED', { productId: product._id, name });

    res.status(201).json({ data: product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { name, description, price, currency, categories, longDescription, commissionRate, related } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (name) product.name = name;
    if (description) product.description = description;
    if (price !== undefined) product.price = price;
    if (currency) product.currency = currency;
    if (categories) product.categories = categories;
    if (longDescription !== undefined) product.longDescription = longDescription;
    if (commissionRate !== undefined) product.commissionRate = commissionRate;
    if (related) product.related = related;

    await product.save();
    
    await logAction(req, 'PRODUCT_UPDATED', { productId: product._id, changes: req.body });

    res.json({ data: product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    await logAction(req, 'PRODUCT_DELETED', { productId: req.params.id, name: product.name });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, riskLevel, search, startDate, endDate } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (riskLevel) query.riskLevel = riskLevel;
    if (search) {
      query.$or = [
        { resellerId: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { paymentId: { $regex: search, $options: 'i' } }
      ];
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);
    
    const stats = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalCommission: { $sum: '$commissionAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      data: {
        transactions,
        stats: stats[0] || { totalAmount: 0, totalCommission: 0, count: 0 },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const prevStatus = transaction.status;

    if (status) transaction.status = status;
    if (notes) transaction.notes = notes;
    if (status === 'paid') transaction.paidAt = new Date();

    await transaction.save();

    // Wallet transitions:
    // - pending (created) already credited to wallet.pendingBalance
    // - approved: move pending → available
    // - rejected: reverse pending (best-effort, non-negative)
    if (status && status !== prevStatus) {
      if (status === 'approved') {
        await movePendingToAvailable({
          resellerId: transaction.resellerId,
          amount: transaction.commissionAmount,
          currency: transaction.currency,
          transactionId: transaction._id,
          refKey: transaction.paymentId || null,
        });
        await onTransactionApproved(transaction);

        try {
          const n = await Notification.create({
            recipientType: 'reseller',
            resellerId: transaction.resellerId,
            title: 'Commission approved',
            message: `Your commission of ${transaction.currency} ${transaction.commissionAmount.toFixed(2)} is now available.`,
            type: 'commission',
            data: { transactionId: transaction._id, commissionAmount: transaction.commissionAmount },
          });
          emitToReseller(transaction.resellerId, 'notification', { notification: n });
        } catch {}
      }
      if (status === 'rejected') {
        await reversePending({
          resellerId: transaction.resellerId,
          amount: transaction.commissionAmount,
          currency: transaction.currency,
          transactionId: transaction._id,
          refKey: transaction.paymentId || null,
        });

        try {
          const n = await Notification.create({
            recipientType: 'reseller',
            resellerId: transaction.resellerId,
            title: 'Commission rejected',
            message: `A commission was rejected. Transaction ${transaction._id} was rejected by admin review.`,
            type: 'commission',
            data: { transactionId: transaction._id },
          });
          emitToReseller(transaction.resellerId, 'notification', { notification: n });
        } catch {}
      }
    }
    
    await logAction(req, 'TRANSACTION_UPDATED', { transactionId: transaction._id, status, notes });

    res.json({ data: transaction });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllPayouts = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, method } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (method) query.method = method;

    const payouts = await Payout.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Payout.countDocuments(query);
    
    const stats = await Payout.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      data: {
        payouts,
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get payouts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const processPayout = async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const payout = await Payout.findById(req.params.id);
    if (!payout) {
      return res.status(404).json({ message: 'Payout not found' });
    }

    if (!['processing', 'paid', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    payout.status = status;
    if (notes) payout.notes = notes;
    if (status === 'paid' || status === 'processing') {
      payout.processedAt = new Date();
    }

    await payout.save();

    if (status === 'paid') {
      await finalizePayoutPaid({
        resellerId: payout.resellerId,
        amount: payout.amount,
        currency: payout.currency,
        payoutId: payout._id,
      });

      try {
        const n = await Notification.create({
          recipientType: 'reseller',
          resellerId: payout.resellerId,
          title: 'Payout paid',
          message: `Your payout of ${payout.currency} ${payout.amount.toFixed(2)} was marked paid.`,
          type: 'payout',
          data: { payoutId: payout._id, amount: payout.amount },
        });
        emitToReseller(payout.resellerId, 'notification', { notification: n });
      } catch {}
    }
    if (status === 'rejected') {
      await releaseLockedOnReject({
        resellerId: payout.resellerId,
        amount: payout.amount,
        currency: payout.currency,
        payoutId: payout._id,
      });

      try {
        const n = await Notification.create({
          recipientType: 'reseller',
          resellerId: payout.resellerId,
          title: 'Payout rejected',
          message: `Your payout request was rejected. Funds were returned to available balance.`,
          type: 'payout',
          data: { payoutId: payout._id, amount: payout.amount },
        });
        emitToReseller(payout.resellerId, 'notification', { notification: n });
      } catch {}
    }
    
    await logAction(req, 'PAYOUT_PROCESSED', { payoutId: payout._id, status, amount: payout.amount });

    res.json({ data: payout });
  } catch (error) {
    console.error('Process payout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAffiliateStats = async (req, res) => {
  try {
    const topAffiliates = await User.aggregate([
      { $match: { role: 'reseller' } },
      {
        $lookup: {
          from: 'transactions',
          localField: 'resellerId',
          foreignField: 'resellerId',
          as: 'transactions'
        }
      },
      {
        $lookup: {
          from: 'clicks',
          localField: 'resellerId',
          foreignField: 'resellerId',
          as: 'clicks'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          resellerId: 1,
          isActive: 1,
          createdAt: 1,
          totalEarnings: { $sum: '$transactions.commissionAmount' },
          totalSales: { $sum: '$transactions.amount' },
          totalConversions: {
            $size: {
              $filter: {
                input: '$transactions',
                as: 't',
                cond: { $in: ['$$t.status', ['approved', 'paid']] }
              }
            }
          },
          totalClicks: { $size: '$clicks' },
          conversionRate: {
            $cond: {
              if: { $gt: [{ $size: '$clicks' }, 0] },
              then: {
                $multiply: [
                  { $divide: [
                    { $size: { $filter: { input: '$transactions', as: 't', cond: { $in: ['$$t.status', ['approved', 'paid']] } } } },
                    { $size: '$clicks' }
                  ]},
                  100
                ]
              },
              else: 0
            }
          }
        }
      },
      { $sort: { totalEarnings: -1 } }
    ]);

    const summary = {
      totalAffiliates: topAffiliates.length,
      activeAffiliates: topAffiliates.filter(a => a.isActive).length,
      totalRevenue: topAffiliates.reduce((sum, a) => sum + a.totalSales, 0),
      totalCommission: topAffiliates.reduce((sum, a) => sum + a.totalEarnings, 0),
      averageConversionRate: topAffiliates.length > 0 
        ? (topAffiliates.reduce((sum, a) => sum + a.conversionRate, 0) / topAffiliates.length).toFixed(2)
        : 0
    };

    res.json({
      data: { topAffiliates, summary }
    });
  } catch (error) {
    console.error('Get affiliate stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAdvancedAnalytics = async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const now = new Date();
    const past = new Date();
    
    if (range === '7d') past.setDate(now.getDate() - 7);
    else if (range === '90d') past.setDate(now.getDate() - 90);
    else past.setDate(now.getDate() - 30);

    const [revenueTrend, affiliatePerformance, productPerformance, fraudStats] = await Promise.all([
      Transaction.aggregate([
        { $match: { createdAt: { $gte: past } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$amount' },
            commission: { $sum: '$commissionAmount' },
            transactions: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      User.aggregate([
        { $match: { role: 'reseller', createdAt: { $gte: past } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            newAffiliates: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Transaction.aggregate([
        { $match: { createdAt: { $gte: past }, status: { $in: ['approved', 'paid'] } } },
        {
          $group: {
            _id: '$productDetails.name',
            count: { $sum: 1 },
            revenue: { $sum: '$amount' }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 }
      ]),
      Transaction.aggregate([
        { $match: { createdAt: { $gte: past } } },
        {
          $group: {
            _id: '$riskLevel',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const trafficSources = await Click.aggregate([
      { $match: { createdAt: { $gte: past } } },
      {
        $group: {
          _id: '$source' || 'direct',
          clicks: { $sum: 1 }
        }
      },
      { $sort: { clicks: -1 } }
    ]);

    res.json({
      data: {
        range,
        revenueTrend,
        affiliatePerformance,
        productPerformance,
        fraudStats,
        trafficSources
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 }).populate('segmentId', 'name status');
    res.json({ data: campaigns });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateCampaign = async (req, res) => {
  try {
    const { id, status, stats, scheduledAt, segmentId, recipients, name, subject, content } = req.body;
    
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (name !== undefined) campaign.name = name;
    if (subject !== undefined) campaign.subject = subject;
    if (content !== undefined) campaign.content = content;
    if (status) campaign.status = status;
    if (scheduledAt !== undefined) campaign.scheduledAt = scheduledAt ? new Date(scheduledAt) : undefined;
    if (segmentId !== undefined) campaign.segmentId = segmentId || null;
    if (recipients !== undefined) campaign.recipients = Array.isArray(recipients) ? recipients : undefined;
    if (stats) {
      campaign.stats.sent = stats.sent ?? campaign.stats.sent;
      campaign.stats.delivered = stats.delivered ?? campaign.stats.delivered;
      campaign.stats.opened = stats.opened ?? campaign.stats.opened;
      campaign.stats.clicked = stats.clicked ?? campaign.stats.clicked;
      campaign.stats.bounced = stats.bounced ?? campaign.stats.bounced;
    }

    await campaign.save();
    
    await logAction(req, 'CAMPAIGN_UPDATED', { campaignId: id, status });

    res.json({ data: campaign });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createCampaignAdmin = async (req, res) => {
  try {
    const { name, subject, content, scheduledAt, segmentId, recipients } = req.body;
    if (!name || !subject || !content) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const campaign = await Campaign.create({
      name,
      subject,
      content,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      status: scheduledAt ? 'Scheduled' : 'Draft',
      createdBy: req.user.id,
      segmentId: segmentId || null,
      recipients: Array.isArray(recipients) ? recipients : undefined,
    });
    await logAction(req, 'CAMPAIGN_CREATED', { campaignId: campaign._id });
    res.status(201).json({ data: campaign });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Segments (admin)
const listSegments = async (req, res) => {
  try {
    const segments = await Segment.find().sort({ createdAt: -1 });
    res.json({ data: segments });
  } catch (error) {
    console.error('List segments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createSegment = async (req, res) => {
  try {
    const { name, description, filters, status } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const segment = await Segment.create({
      name,
      description: description || '',
      status: status || 'active',
      filters: filters || {},
      createdBy: req.user.id,
    });
    await logAction(req, 'SEGMENT_CREATED', { segmentId: segment._id });
    res.status(201).json({ data: segment });
  } catch (error) {
    console.error('Create segment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Leaderboard (admin)
const getLeaderboard = async (req, res) => {
  try {
    const { range = '30d', limit = 20 } = req.query;
    const now = new Date();
    const past = new Date();
    if (range === '7d') past.setDate(now.getDate() - 7);
    else if (range === '90d') past.setDate(now.getDate() - 90);
    else past.setDate(now.getDate() - 30);

    const rows = await Transaction.aggregate([
      { $match: { createdAt: { $gte: past }, status: { $in: ['approved', 'paid'] } } },
      {
        $group: {
          _id: '$resellerId',
          revenue: { $sum: '$amount' },
          commission: { $sum: '$commissionAmount' },
          conversions: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: Math.max(1, Math.min(100, Number(limit))) },
    ]);

    res.json({ data: { range, leaderboard: rows } });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateSegment = async (req, res) => {
  try {
    const { id } = req.params;
    const segment = await Segment.findById(id);
    if (!segment) return res.status(404).json({ message: 'Segment not found' });
    const { name, description, filters, status } = req.body;
    if (name !== undefined) segment.name = name;
    if (description !== undefined) segment.description = description;
    if (filters !== undefined) segment.filters = filters;
    if (status !== undefined) segment.status = status;
    await segment.save();
    await logAction(req, 'SEGMENT_UPDATED', { segmentId: segment._id });
    res.json({ data: segment });
  } catch (error) {
    console.error('Update segment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteSegment = async (req, res) => {
  try {
    const { id } = req.params;
    const seg = await Segment.findByIdAndDelete(id);
    if (!seg) return res.status(404).json({ message: 'Segment not found' });
    await logAction(req, 'SEGMENT_DELETED', { segmentId: id });
    res.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Delete segment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getFraudAnalysis = async (req, res) => {
  try {
    const highRiskTransactions = await Transaction.find({
      riskLevel: { $in: ['high', 'critical'] }
    })
    .sort({ fraudScore: -1 })
    .limit(50);

    const fraudSummary = await Transaction.aggregate([
      {
        $group: {
          _id: '$riskLevel',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const suspiciousPatterns = await Transaction.aggregate([
      { $match: { riskLevel: { $in: ['high', 'critical'] } } },
      {
        $group: {
          _id: '$resellerId',
          count: { $sum: 1 },
          avgFraudScore: { $avg: '$fraudScore' },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $match: { count: { $gt: 3 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const recentFlags = await Transaction.find({
      riskLevel: { $in: ['high', 'critical'] },
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).limit(20);

    res.json({
      data: {
        highRiskTransactions,
        fraudSummary,
        suspiciousPatterns,
        recentFlags
      }
    });
  } catch (error) {
    console.error('Get fraud analysis error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const reviewFraudTransaction = async (req, res) => {
  try {
    const { id, action, notes } = req.body;
    
    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (action === 'approve') {
      transaction.riskLevel = 'low';
      transaction.fraudScore = 0;
      transaction.status = 'approved';
    } else if (action === 'reject') {
      transaction.status = 'rejected';
    }

    if (notes) transaction.notes = notes;
    await transaction.save();
    
    await logAction(req, 'FRAUD_REVIEWED', { transactionId: id, action, riskLevel: transaction.riskLevel });

    res.json({ data: transaction });
  } catch (error) {
    console.error('Review fraud transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, userId } = req.query;
    
    const query = {};
    if (action) query.action = action;
    if (userId) query.userId = userId;

    const logs = await AuditLog.find(query)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    const actionTypes = await AuditLog.distinct('action');

    res.json({
      data: {
        logs,
        actionTypes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getSystemSettings = async (req, res) => {
  try {
    const settings = {
      commissionRate: 10,
      platformFee: 0,
      payoutMethods: ['beam_wallet', 'bank_transfer', 'paypal'],
      minPayoutAmount: 100,
      fraudThresholds: {
        low: 25,
        medium: 50,
        high: 75,
        critical: 90
      },
      emailSettings: {
        fromName: 'Beam Affiliate',
        fromEmail: 'noreply@beam.com'
      }
    };

    res.json({ data: settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateSystemSettings = async (req, res) => {
  try {
    const settings = req.body;
    
    await logAction(req, 'SETTINGS_UPDATED', { settings });

    res.json({
      data: settings,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAdminDashboard,
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllTransactions,
  updateTransaction,
  getAllPayouts,
  processPayout,
  getAffiliateStats,
  getAdvancedAnalytics,
  getCampaigns,
  updateCampaign,
  createCampaignAdmin,
  listSegments,
  createSegment,
  updateSegment,
  deleteSegment,
  getLeaderboard,
  getFraudAnalysis,
  reviewFraudTransaction,
  getAuditLogs,
  getSystemSettings,
  updateSystemSettings
};
