/**
 * Gamification Engine
 * Calculates reseller levels, XP, and achievements from affiliate performance data.
 * No schema changes needed — derived from existing referrals, conversions, and commissions.
 */

// ─── Level System ─────────────────────────────────────────

export interface ResellerLevel {
  level: number;
  name: string;
  minXP: number;
  icon: string;       // emoji
  color: string;       // tailwind gradient
  perks: string[];
}

export const LEVELS: ResellerLevel[] = [
  { level: 1, name: 'Beginner', minXP: 0, icon: '🌱', color: 'from-gray-400 to-gray-500', perks: ['Basic dashboard access'] },
  { level: 2, name: 'Active', minXP: 500, icon: '⚡', color: 'from-amber-600 to-amber-700', perks: ['Priority support', 'Custom referral code', '+2% commission bonus'] },
  { level: 3, name: 'Ambassador', minXP: 2000, icon: '👑', color: 'from-violet-500 to-purple-600', perks: ['+10% commission bonus', 'Dedicated account manager', 'Exclusive promotions', 'VIP events'] },
];

// ─── XP Calculation ───────────────────────────────────────

export interface XPBreakdown {
  referrals: number;     // 10 XP per approved referral
  conversions: number;   // 25 XP per conversion
  revenue: number;       // 1 XP per €10 in sales
  streak: number;        // Bonus for consecutive active months
  total: number;
}

export function calculateXP(stats: {
  totalReferrals: number;
  approvedReferrals: number;
  totalConversions: number;
  totalRevenueCents: number;
  activeMonths: number;
}): XPBreakdown {
  const referrals = stats.approvedReferrals * 10;
  const conversions = stats.totalConversions * 25;
  const revenue = Math.floor(stats.totalRevenueCents / 1000); // 1 XP per €10
  const streak = stats.activeMonths >= 3 ? stats.activeMonths * 15 : 0;
  return { referrals, conversions, revenue, streak, total: referrals + conversions + revenue + streak };
}

export function getLevelForXP(xp: number): ResellerLevel {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.minXP) current = level;
    else break;
  }
  return current;
}

export function getNextLevel(currentLevel: number): ResellerLevel | null {
  return LEVELS.find(l => l.level === currentLevel + 1) || null;
}

export function getLevelProgress(xp: number): { current: ResellerLevel; next: ResellerLevel | null; progressPercent: number; xpToNext: number } {
  const current = getLevelForXP(xp);
  const next = getNextLevel(current.level);
  if (!next) return { current, next: null, progressPercent: 100, xpToNext: 0 };
  const xpInLevel = xp - current.minXP;
  const xpNeeded = next.minXP - current.minXP;
  return { current, next, progressPercent: Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)), xpToNext: next.minXP - xp };
}

// ─── Achievements ─────────────────────────────────────────

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'referrals' | 'sales' | 'milestones' | 'engagement';
  requirement: (stats: AchievementStats) => boolean;
  xpReward: number;
}

export interface AchievementStats {
  totalReferrals: number;
  approvedReferrals: number;
  totalConversions: number;
  totalRevenueCents: number;
  totalCommissionCents: number;
  totalClicks: number;
  activeMonths: number;
  firstReferralDate: Date | null;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Referrals
  { id: 'first_referral', name: 'First Steps', description: 'Submit your first referral', icon: '🚀', category: 'referrals', requirement: s => s.totalReferrals >= 1, xpReward: 10 },
  { id: 'referral_5', name: 'Connector', description: 'Get 5 approved referrals', icon: '🤝', category: 'referrals', requirement: s => s.approvedReferrals >= 5, xpReward: 25 },
  { id: 'referral_25', name: 'Networker', description: 'Get 25 approved referrals', icon: '🌐', category: 'referrals', requirement: s => s.approvedReferrals >= 25, xpReward: 75 },
  { id: 'referral_100', name: 'Influencer', description: 'Get 100 approved referrals', icon: '⭐', category: 'referrals', requirement: s => s.approvedReferrals >= 100, xpReward: 200 },

  // Sales
  { id: 'first_sale', name: 'First Sale', description: 'Generate your first conversion', icon: '💰', category: 'sales', requirement: s => s.totalConversions >= 1, xpReward: 20 },
  { id: 'sales_10', name: 'Closer', description: 'Generate 10 conversions', icon: '📈', category: 'sales', requirement: s => s.totalConversions >= 10, xpReward: 50 },
  { id: 'sales_50', name: 'Sales Machine', description: 'Generate 50 conversions', icon: '🏆', category: 'sales', requirement: s => s.totalConversions >= 50, xpReward: 150 },
  { id: 'revenue_1k', name: 'Revenue Maker', description: 'Generate €1,000 in total sales', icon: '💵', category: 'sales', requirement: s => s.totalRevenueCents >= 100000, xpReward: 100 },
  { id: 'revenue_10k', name: 'Revenue Driver', description: 'Generate €10,000 in total sales', icon: '🏦', category: 'sales', requirement: s => s.totalRevenueCents >= 1000000, xpReward: 300 },
  { id: 'revenue_100k', name: 'Revenue Legend', description: 'Generate €100,000 in total sales', icon: '💎', category: 'sales', requirement: s => s.totalRevenueCents >= 10000000, xpReward: 1000 },

  // Milestones
  { id: 'commission_500', name: 'Earned €500', description: 'Earn €500 in total commissions', icon: '🎯', category: 'milestones', requirement: s => s.totalCommissionCents >= 50000, xpReward: 50 },
  { id: 'commission_5k', name: 'Earned €5,000', description: 'Earn €5,000 in total commissions', icon: '🌟', category: 'milestones', requirement: s => s.totalCommissionCents >= 500000, xpReward: 200 },
  { id: 'clicks_100', name: 'Link Magnet', description: 'Get 100 clicks on your links', icon: '🔗', category: 'milestones', requirement: s => s.totalClicks >= 100, xpReward: 30 },
  { id: 'clicks_1000', name: 'Traffic King', description: 'Get 1,000 clicks on your links', icon: '👑', category: 'milestones', requirement: s => s.totalClicks >= 1000, xpReward: 100 },

  // Engagement
  { id: 'month_3', name: 'Consistent', description: 'Active for 3+ months', icon: '📅', category: 'engagement', requirement: s => s.activeMonths >= 3, xpReward: 40 },
  { id: 'month_6', name: 'Dedicated', description: 'Active for 6+ months', icon: '🏅', category: 'engagement', requirement: s => s.activeMonths >= 6, xpReward: 80 },
  { id: 'month_12', name: 'Veteran', description: 'Active for 12+ months', icon: '🎖️', category: 'engagement', requirement: s => s.activeMonths >= 12, xpReward: 200 },
];

export function getUnlockedAchievements(stats: AchievementStats): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.requirement(stats));
}

export function getLockedAchievements(stats: AchievementStats): Achievement[] {
  return ACHIEVEMENTS.filter(a => !a.requirement(stats));
}
