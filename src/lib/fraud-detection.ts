import { prisma } from './prisma';

export interface FraudCheckResult {
    isSuspicious: boolean;
    reasons: string[];
    riskScore: number; // 0-100
}

const SUSPICIOUS_USER_AGENTS = [
    'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python-requests',
    'Go-http-client', 'Java/', 'okhttp', 'libwww', 'HTTrack',
];

const MAX_CLICKS_PER_IP_PER_HOUR = 10;
const MAX_CLICKS_PER_AFFILIATE_PER_IP_DAY = 5;

/**
 * Checks if an IP + userAgent combination looks suspicious.
 */
export function isBotUserAgent(userAgent: string): boolean {
    const ua = userAgent.toLowerCase();
    return SUSPICIOUS_USER_AGENTS.some(bot => ua.includes(bot.toLowerCase()));
}

/**
 * Comprehensive fraud check for a referral click.
 */
export async function checkFraud({
    ipAddress,
    userAgent,
    affiliateId,
    deviceFingerprint,
}: {
    ipAddress: string;
    userAgent: string;
    affiliateId: string;
    deviceFingerprint?: string;
}): Promise<FraudCheckResult> {
    const reasons: string[] = [];
    let riskScore = 0;

    // 1. Bot/automated user agent check
    if (isBotUserAgent(userAgent)) {
        reasons.push('Suspicious user agent (possible bot)');
        riskScore += 60;
    }

    // 2. Check click frequency from the same IP in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentClicksFromIP = await prisma.referralClick.count({
        where: {
            ipAddress,
            createdAt: { gte: oneHourAgo },
        },
    });

    if (recentClicksFromIP >= MAX_CLICKS_PER_IP_PER_HOUR) {
        reasons.push(`High click frequency: ${recentClicksFromIP} clicks from same IP in last hour`);
        riskScore += 30;
    }

    // 3. Check if same IP already clicked for this affiliate today
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const clicksForAffiliateFromIP = await prisma.referralClick.count({
        where: {
            ipAddress,
            createdAt: { gte: oneDayAgo },
            referral: {
                affiliateId,
            },
        },
    });

    if (clicksForAffiliateFromIP >= MAX_CLICKS_PER_AFFILIATE_PER_IP_DAY) {
        reasons.push(`Duplicate IP: ${clicksForAffiliateFromIP} clicks for same affiliate from same IP today`);
        riskScore += 40;
    }

    // 4. Private/loopback IP ranges (could indicate self-referral or test)
    const isPrivateIP = /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(ipAddress);
    if (isPrivateIP) {
        reasons.push('Private/internal IP address');
        riskScore += 10;
    }

    // 5. Device fingerprint check (if provided)
    if (deviceFingerprint) {
        const fpResult = await checkDeviceFingerprint(deviceFingerprint, affiliateId);
        if (fpResult.suspicious) {
            reasons.push(...fpResult.reasons);
            riskScore += fpResult.riskDelta;
        }
    }

    const isSuspicious = riskScore >= 40;

    return {
        isSuspicious,
        reasons,
        riskScore: Math.min(riskScore, 100),
    };
}

// ─── Device Fingerprint Fraud Checks ──────────────────────────

const MAX_AFFILIATES_PER_DEVICE = 2; // Same device shouldn't be used for many affiliates
const MAX_CLICKS_PER_DEVICE_PER_HOUR = 15;

/**
 * Check if a device fingerprint is associated with suspicious activity.
 */
async function checkDeviceFingerprint(
    fingerprint: string,
    affiliateId: string
): Promise<{ suspicious: boolean; reasons: string[]; riskDelta: number }> {
    const reasons: string[] = [];
    let riskDelta = 0;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Check 1: Same device fingerprint used for too many clicks in an hour
    const recentClicksWithFP = await prisma.referralClick.count({
        where: {
            createdAt: { gte: oneHourAgo },
            metadata: {
                path: ['device_fingerprint'],
                equals: fingerprint,
            },
        },
    });

    if (recentClicksWithFP >= MAX_CLICKS_PER_DEVICE_PER_HOUR) {
        reasons.push(`High device activity: ${recentClicksWithFP} clicks from same device in last hour`);
        riskDelta += 35;
    }

    // Check 2: Same device fingerprint across multiple affiliates (self-referral pattern)
    const clicksFromDevice = await prisma.referralClick.findMany({
        where: {
            createdAt: { gte: oneDayAgo },
            metadata: {
                path: ['device_fingerprint'],
                equals: fingerprint,
            },
        },
        select: {
            referral: {
                select: { affiliateId: true },
            },
        },
        take: 50,
    });

    const uniqueAffiliates = new Set(
        clicksFromDevice.map((c) => c.referral.affiliateId)
    );

    if (uniqueAffiliates.size > MAX_AFFILIATES_PER_DEVICE) {
        reasons.push(`Device used across ${uniqueAffiliates.size} different affiliate accounts (possible self-referral)`);
        riskDelta += 50;
    }

    return {
        suspicious: riskDelta > 0,
        reasons,
        riskDelta,
    };
}

/**
 * Logs a fraud event to the referralClick metadata.
 */
export async function logFraudEvent(clickId: string, fraudResult: FraudCheckResult) {
    await prisma.referralClick.update({
        where: { id: clickId },
        data: {
            metadata: {
                fraud_check: {
                    is_suspicious: fraudResult.isSuspicious,
                    risk_score: fraudResult.riskScore,
                    reasons: fraudResult.reasons,
                    checked_at: new Date().toISOString(),
                },
            },
        },
    });
}

