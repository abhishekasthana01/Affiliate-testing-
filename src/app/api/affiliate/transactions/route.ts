import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/affiliate/transactions — Get complete sales & payment history
 * Returns all transactions tied to this affiliate's referrals
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

    // Fetch all transactions for this affiliate
    const transactions = await (prisma as any).transaction.findMany({
      where: { affiliateId },
      include: {
        referral: {
          select: {
            id: true,
            leadName: true,
            leadEmail: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary stats
    const totalSalesCents = transactions.reduce((sum: number, t: any) => sum + t.amountCents, 0);
    const totalCommissionCents = transactions.reduce((sum: number, t: any) => sum + t.commissionCents, 0);
    const completedTxns = transactions.filter((t: any) => t.status === 'COMPLETED');
    const pendingTxns = transactions.filter((t: any) => t.status === 'PENDING');
    const refundedTxns = transactions.filter((t: any) => t.status === 'REFUNDED');

    const { getCurrencySymbol } = await import('@/lib/currency');
    const currencySymbol = await getCurrencySymbol();

    return NextResponse.json({
      success: true,
      transactions: transactions.map((t: any) => ({
        id: t.id,
        // Customer info
        customerName: t.customerName,
        customerEmail: t.customerEmail,
        // Sale details
        amountCents: t.amountCents,
        commissionCents: t.commissionCents,
        commissionRate: t.commissionRate,
        // Status & payment
        status: t.status,
        description: t.description,
        paymentMethod: t.paymentMethod,
        invoiceId: t.invoiceId,
        paidAt: t.paidAt?.toISOString() || null,
        // Referral context
        referralId: t.referralId,
        referralName: t.referral?.leadName || t.customerName,
        referralStatus: t.referral?.status || 'UNKNOWN',
        // Dates
        createdAt: t.createdAt.toISOString(),
      })),
      summary: {
        totalTransactions: transactions.length,
        totalSalesCents,
        totalCommissionCents,
        completedCount: completedTxns.length,
        completedSalesCents: completedTxns.reduce((s: number, t: any) => s + t.amountCents, 0),
        pendingCount: pendingTxns.length,
        pendingSalesCents: pendingTxns.reduce((s: number, t: any) => s + t.amountCents, 0),
        refundedCount: refundedTxns.length,
        refundedSalesCents: refundedTxns.reduce((s: number, t: any) => s + t.amountCents, 0),
        averageOrderCents: transactions.length > 0
          ? Math.round(totalSalesCents / transactions.length)
          : 0,
      },
      currencySymbol,
    });
  } catch (error) {
    console.error('Affiliate transactions error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
