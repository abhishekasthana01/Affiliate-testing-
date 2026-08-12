import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!;
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get date range from query params (default to last 30 days)
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Top performing affiliates
    const topAffiliates = await prisma.affiliate.findMany({
      take: 10,
      orderBy: {
        balanceCents: 'desc'
      },
      include: {
        user: true,
        referrals: {
          where: {
            status: 'APPROVED'
          }
        },
        commissions: {
          where: {
            status: 'APPROVED'
          }
        }
      }
    });

    // Referral conversion rate
    const totalReferrals = await prisma.referral.count({
      where: {
        createdAt: { gte: startDate }
      }
    });

    const approvedReferrals = await prisma.referral.count({
      where: {
        status: 'APPROVED',
        createdAt: { gte: startDate }
      }
    });

    const conversionRate = totalReferrals > 0 ? (approvedReferrals / totalReferrals) * 100 : 0;

    // Revenue over time (daily) - Fetch raw conversions and group in memory
    const conversions = await prisma.conversion.findMany({
      where: {
        createdAt: { gte: startDate },
        status: 'APPROVED'
      },
      select: {
        createdAt: true,
        amountCents: true
      }
    });

    const dailyRevenueMap: Record<string, number> = {};
    conversions.forEach(c => {
      const day = new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyRevenueMap[day] = (dailyRevenueMap[day] || 0) + (c.amountCents / 100);
    });

    const dailyRevenue = Object.entries(dailyRevenueMap).map(([name, revenue]) => ({
      name,
      revenue
    })).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

    // Commission statistics
    const totalCommissions = await prisma.commission.aggregate({
      _sum: { amountCents: true },
      _count: true,
      where: {
        createdAt: { gte: startDate }
      }
    });

    const paidCommissions = await prisma.commission.aggregate({
      _sum: { amountCents: true },
      _count: true,
      where: {
        paidAt: { not: null },
        createdAt: { gte: startDate }
      }
    });

    // Referral status breakdown
    const referralsByStatus = await prisma.referral.groupBy({
      by: ['status'],
      _count: true,
      where: {
        createdAt: { gte: startDate }
      }
    });

    // Partner levels breakdown
    const affiliatesData = await prisma.affiliate.findMany({
      include: {
        referrals: { where: { status: 'APPROVED' } },
        conversions: { where: { status: 'APPROVED' } },
      }
    });

    const { calculateXP, getLevelForXP } = await import('@/lib/gamification');
    const levelsBreakdown: Record<string, number> = {
      'Beginner': 0,
      'Active': 0,
      'Ambassador': 0,
    };

    affiliatesData.forEach(aff => {
      const totalRevenueCents = aff.conversions.reduce((sum, c) => sum + c.amountCents, 0);
      const xpData = calculateXP({
        totalReferrals: aff.referrals.length,
        approvedReferrals: aff.referrals.length,
        totalConversions: aff.conversions.length,
        totalRevenueCents,
        activeMonths: 1, // Default for now
      });
      const level = getLevelForXP(xpData.total);
      levelsBreakdown[level.name] = (levelsBreakdown[level.name] || 0) + 1;
    });

    const analytics = {
      overview: {
        totalReferrals,
        approvedReferrals,
        conversionRate: conversionRate.toFixed(2),
        totalRevenue: totalCommissions._sum.amountCents || 0,
        totalCommissionsPaid: paidCommissions._sum.amountCents || 0,
        pendingCommissions: (totalCommissions._sum.amountCents || 0) - (paidCommissions._sum.amountCents || 0)
      },
      topAffiliates: topAffiliates.map(affiliate => ({
        id: affiliate.id,
        name: affiliate.user.name,
        email: affiliate.user.email,
        referralCode: affiliate.referralCode,
        totalReferrals: affiliate.referrals.length,
        totalEarnings: affiliate.balanceCents,
        totalCommissions: affiliate.commissions.length
      })),
      referralsByStatus: referralsByStatus.map(item => ({
        status: item.status,
        count: item._count
      })),
      dailyRevenue,
      levelsBreakdown: Object.entries(levelsBreakdown).map(([name, value]) => ({
        name,
        value,
        color: name === 'Beginner' ? '#3b82f6' : name === 'Active' ? '#10b981' : '#8b5cf6'
      })).filter(item => item.value > 0), // Only show levels with members
      commissionStats: {
        total: {
          count: totalCommissions._count,
          amount: totalCommissions._sum.amountCents || 0
        },
        paid: {
          count: paidCommissions._count,
          amount: paidCommissions._sum.amountCents || 0
        },
        pending: {
          count: totalCommissions._count - paidCommissions._count,
          amount: (totalCommissions._sum.amountCents || 0) - (paidCommissions._sum.amountCents || 0)
        }
      }
    };

    return NextResponse.json({
      success: true,
      analytics,
      period: `Last ${days} days`
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}