import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/affiliate/commissions — Get all commissions for the logged-in affiliate
 * Shows transparent commission calculation: sale amount, rate, commission earned, status
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { affiliate: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    if (user.role !== 'AFFILIATE') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!user.affiliate) {
      return NextResponse.json({ error: 'Affiliate profile not found' }, { status: 404 });
    }

    const affiliateId = user.affiliate.id;

    // Fetch all commissions with conversion details
    const commissions = await prisma.commission.findMany({
      where: { affiliateId },
      include: {
        conversion: {
          include: {
            referral: true,
          },
        },
        payout: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary stats
    const totalEarnedCents = commissions.reduce((sum, c) => sum + c.amountCents, 0);
    const pendingCents = commissions
      .filter((c) => c.status === 'PENDING')
      .reduce((sum, c) => sum + c.amountCents, 0);
    const approvedCents = commissions
      .filter((c) => c.status === 'APPROVED')
      .reduce((sum, c) => sum + c.amountCents, 0);
    const paidCents = commissions
      .filter((c) => c.status === 'PAID')
      .reduce((sum, c) => sum + c.amountCents, 0);

    const { getCurrencySymbol } = await import('@/lib/currency');
    const currencySymbol = await getCurrencySymbol();

    return NextResponse.json({
      success: true,
      commissions: commissions.map((c) => ({
        id: c.id,
        // Sale details
        saleAmountCents: c.conversion?.amountCents || 0,
        // Commission calculation
        commissionRate: c.rate,
        commissionAmountCents: c.amountCents,
        // Status & lifecycle
        status: c.status,
        maturesAt: c.maturesAt?.toISOString() || null,
        approvedAt: c.approvedAt?.toISOString() || null,
        // Context
        customerName: c.conversion?.referral?.leadName || 'Unknown',
        customerEmail: c.conversion?.referral?.leadEmail || '',
        eventType: c.conversion?.eventType || 'SALE',
        // Payout info
        payoutId: c.payoutId || null,
        payoutStatus: c.payout?.status || null,
        // Dates
        createdAt: c.createdAt.toISOString(),
      })),
      summary: {
        totalCommissions: commissions.length,
        totalEarnedCents,
        pendingCents,
        approvedCents,
        paidCents,
        currentBalanceCents: user.affiliate.balanceCents,
      },
      currencySymbol,
    });
  } catch (error) {
    console.error('Affiliate commissions error:', error);
    return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 });
  }
}
