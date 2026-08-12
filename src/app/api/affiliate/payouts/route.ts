import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!;
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        affiliate: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    if (user.role !== 'AFFILIATE') {
      return NextResponse.json(
        { error: 'Access denied. Affiliate role required.' },
        { status: 403 }
      );
    }

    if (!user.affiliate) {
      return NextResponse.json(
        { error: 'Affiliate profile not found' },
        { status: 404 }
      );
    }

    // Get payouts for this affiliate
    const payouts = await prisma.payout.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        commissions: true
      }
    });

    return NextResponse.json({
      success: true,
      payouts: payouts.map(p => ({
        id: p.id,
        amount: p.amountCents,
        status: p.status,
        method: p.method,
        createdAt: p.createdAt.toISOString(),
        paidAt: p.processedAt?.toISOString() || null
      }))
    });
  } catch (error) {
    console.error('Affiliate payouts API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payouts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!;
    
    // Get user and affiliate profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        affiliate: true
      }
    });

    if (!user || !user.affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get program settings for threshold
    const settings = await prisma.programSettings.findFirst();
    const threshold = settings?.minimumPayoutThreshold || 100000; // Default €1000 in cents

    // Find all APPROVED commissions that are not yet linked to a payout
    const commissions = await prisma.commission.findMany({
      where: {
        affiliateId: user.affiliate.id,
        status: 'APPROVED',
        payoutId: null
      }
    });

    const totalAmountCents = commissions.reduce((sum, c) => sum + c.amountCents, 0);

    if (totalAmountCents < threshold) {
      const { getCurrencySymbol } = await import('@/lib/currency');
      const symbol = await getCurrencySymbol();
      return NextResponse.json({ 
        error: `Minimum payout threshold not met. You need at least ${symbol}${(threshold/100).toLocaleString()}.` 
      }, { status: 400 });
    }

    const payout = await prisma.$transaction(async (tx) => {
      const createdPayout = await tx.payout.create({
        data: {
          affiliateId: user.affiliate!.id,
          userId: user.id,
          amountCents: totalAmountCents,
          commissionCount: commissions.length,
          status: 'PENDING',
          method: (user.affiliate!.payoutDetails as any)?.paymentMethod || 'Stripe',
          createdBy: user.id,
        }
      });

      // PAID means the commission is locked into a payout, so remove it from available balance.
      await tx.commission.updateMany({
        where: {
          id: { in: commissions.map(c => c.id) }
        },
        data: {
          payoutId: createdPayout.id,
          status: 'PAID',
          paidAt: new Date()
        }
      });

      const currentAffiliate = await tx.affiliate.findUnique({
        where: { id: user.affiliate!.id },
        select: { balanceCents: true },
      });

      await tx.affiliate.update({
        where: { id: user.affiliate!.id },
        data: {
          balanceCents: Math.max((currentAffiliate?.balanceCents || 0) - totalAmountCents, 0)
        }
      });

      return createdPayout;
    });

    // Send email notification to admin (optional, but good for UX)
    try {
      const { emailService } = await import('@/lib/email');
      await emailService.sendPayoutCreatedEmail(user.email, {
        affiliateName: user.name || user.email,
        amountCents: totalAmountCents,
        commissionCount: commissions.length,
        payoutId: payout.id,
        method: (user.affiliate.payoutDetails as any)?.paymentMethod || 'Stripe'
      });
    } catch (e) {
      console.error('Failed to send payout notification email:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Payout request created successfully',
      payoutId: payout.id
    });

  } catch (error) {
    console.error('Create payout request error:', error);
    return NextResponse.json(
      { error: 'Failed to create payout request' },
      { status: 500 }
    );
  }
}
