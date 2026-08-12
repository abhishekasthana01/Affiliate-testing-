import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  calculateXP, getLevelProgress, getUnlockedAchievements,
  getLockedAchievements, LEVELS, type AchievementStats,
} from '@/lib/gamification';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { affiliate: true },
    });

    if (!user?.affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 });
    }

    const affiliateId = user.affiliate.id;

    // Gather stats from existing data
    const [
      totalReferrals, approvedReferrals, totalConversions,
      revenueAgg, commissionAgg, totalClicks, firstReferral,
    ] = await Promise.all([
      prisma.referral.count({ where: { affiliateId } }),
      prisma.referral.count({ where: { affiliateId, status: 'APPROVED' } }),
      prisma.conversion.count({ where: { affiliateId } }),
      prisma.conversion.aggregate({ where: { affiliateId }, _sum: { amountCents: true } }),
      prisma.commission.aggregate({ where: { affiliateId }, _sum: { amountCents: true } }),
      prisma.referralClick.count({
        where: { referral: { affiliateId } },
      }),
      prisma.referral.findFirst({
        where: { affiliateId },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
    ]);

    const totalRevenueCents = revenueAgg._sum?.amountCents || 0;
    const totalCommissionCents = commissionAgg._sum?.amountCents || 0;

    // Calculate active months
    const createdAt = user.affiliate.createdAt || new Date();
    const activeMonths = Math.max(1, Math.floor(
      (Date.now() - new Date(createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000)
    ));

    const stats: AchievementStats = {
      totalReferrals, approvedReferrals, totalConversions,
      totalRevenueCents, totalCommissionCents, totalClicks,
      activeMonths,
      firstReferralDate: firstReferral?.createdAt || null,
    };

    // Calculate XP and level
    const xpBreakdown = calculateXP({
      totalReferrals, approvedReferrals, totalConversions,
      totalRevenueCents, activeMonths,
    });

    // Add achievement XP bonus
    const unlocked = getUnlockedAchievements(stats);
    const achievementXP = unlocked.reduce((s, a) => s + a.xpReward, 0);
    const totalXP = xpBreakdown.total + achievementXP;

    const levelProgress = getLevelProgress(totalXP);
    const locked = getLockedAchievements(stats);

    return NextResponse.json({
      success: true,
      xp: { ...xpBreakdown, achievements: achievementXP, total: totalXP },
      level: {
        current: levelProgress.current,
        next: levelProgress.next,
        progressPercent: levelProgress.progressPercent,
        xpToNext: levelProgress.xpToNext,
      },
      achievements: {
        unlocked: unlocked.map(a => ({ id: a.id, name: a.name, description: a.description, icon: a.icon, category: a.category, xpReward: a.xpReward })),
        locked: locked.map(a => ({ id: a.id, name: a.name, description: a.description, icon: a.icon, category: a.category, xpReward: a.xpReward })),
        totalUnlocked: unlocked.length,
        totalAchievements: unlocked.length + locked.length,
      },
      stats,
      allLevels: LEVELS,
    });
  } catch (error) {
    console.error('Gamification error:', error);
    return NextResponse.json({ error: 'Failed to load gamification data' }, { status: 500 });
  }
}
