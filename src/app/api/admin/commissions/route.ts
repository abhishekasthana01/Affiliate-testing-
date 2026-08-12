import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!;
    const { searchParams } = new URL(request.url);
    const affiliateId = searchParams.get('affiliateId');

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const where: any = {};
    if (affiliateId) {
      where.affiliateId = affiliateId;
    }

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        affiliate: {
          include: { user: true }
        },
        conversion: {
          include: { referral: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      commissions: commissions.map(comm => ({
        id: comm.id,
        customerName: comm.conversion?.referral?.leadName || 'System',
        amountCents: comm.amountCents,
        rate: comm.rate * 100, // Frontend expects percentage
        status: comm.status,
        createdAt: comm.createdAt,
        paidAt: comm.paidAt,
      }))
    });

  } catch (error) {
    console.error('Get commissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
