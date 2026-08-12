import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({
        success: true,
        service: 'commissions',
        message: 'Send x-user-id to retrieve commission data.',
        endpoints: {
          affiliateCommissions: '/api/affiliate/commissions',
          matureCommissions: '/api/admin/commissions/mature',
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { affiliate: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const where = user.role === 'ADMIN'
      ? {}
      : user.affiliate
        ? { affiliateId: user.affiliate.id }
        : null;

    if (!where) {
      return NextResponse.json({ error: 'Affiliate profile not found' }, { status: 404 });
    }

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        affiliate: { include: { user: { select: { name: true, email: true } } } },
        conversion: { include: { referral: true } },
        payout: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      commissions: commissions.map((commission) => ({
        id: commission.id,
        affiliateId: commission.affiliateId,
        affiliateName: commission.affiliate.user.name,
        affiliateEmail: commission.affiliate.user.email,
        saleAmountCents: commission.conversion?.amountCents || 0,
        commissionAmountCents: commission.amountCents,
        commissionRate: commission.rate,
        status: commission.status,
        maturesAt: commission.maturesAt?.toISOString() || null,
        paidAt: commission.paidAt?.toISOString() || null,
        originalPaymentId: (commission.conversion?.eventMetadata as any)?.originalPaymentId || null,
        payoutId: commission.payoutId || null,
        payoutStatus: commission.payout?.status || null,
        createdAt: commission.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Commissions compatibility API error:', error);
    return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 });
  }
}
