import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


async function verifyAdmin(request: NextRequest) {
  try {
    const cronSecret = request.headers.get('x-cron-secret');
    if (cronSecret && cronSecret === process.env.CRON_SECRET) {
      return { id: 'system-cron', name: 'System Cron', email: 'system@beamaffiliate.local', role: 'ADMIN' } as any;
    }

    const userId = request.headers.get('x-user-id');
    if (!userId) return null;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role as string !== 'ADMIN')) return null;
    return user;
  } catch (_e) { return null; }
}

// POST - Process auto-payouts for all eligible affiliates
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { dryRun = false } = await request.json().catch(() => ({ dryRun: false }));

    // Get program settings for min payout threshold and payment-order cadence
    const settings = await prisma.programSettings.findFirst();
    const minPayoutCents = settings?.minPayoutCents || 100000; // Default €1000
    const payoutFrequency = settings?.payoutFrequency || 'MONTHLY';
    const payoutCurrency = settings?.currency || 'EUR';

    // Find all affiliates with balance above minimum payout threshold
    // Status check is on User model, not Affiliate
    const eligibleAffiliates = await prisma.affiliate.findMany({
      where: {
        balanceCents: { gte: minPayoutCents },
        user: { status: 'ACTIVE' },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (eligibleAffiliates.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No affiliates eligible for auto-payout',
        processed: 0,
        totalAmountCents: 0,
      });
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        eligible: eligibleAffiliates.map(a => ({
          id: a.id,
          name: a.user.name,
          email: a.user.email,
          balanceCents: a.balanceCents,
        })),
        totalAffiliates: eligibleAffiliates.length,
        totalAmountCents: eligibleAffiliates.reduce((s, a) => s + a.balanceCents, 0),
      });
    }

    // Process payouts — use Beam Wallet for instant delivery if configured
    const { beamWallet } = await import('@/lib/beam-wallet');
    const beamConfigured = beamWallet.isConfigured();

    const results: Array<{
      affiliateId: string;
      name: string;
      payoutId?: string;
      amountCents?: number;
      status: string;
      beamTransactionId?: string;
      error?: string;
    }> = [];
    let totalProcessed = 0;
    let totalAmountCents = 0;

    for (const affiliate of eligibleAffiliates) {
      try {
        const payableCommissions = await prisma.commission.findMany({
          where: {
            affiliateId: affiliate.id,
            status: 'APPROVED',
            payoutId: null,
          },
          select: {
            id: true,
            amountCents: true,
          },
        });
        const payoutAmountCents = payableCommissions.reduce((sum, c) => sum + c.amountCents, 0);

        if (payoutAmountCents < minPayoutCents) {
          results.push({
            affiliateId: affiliate.id,
            name: affiliate.user.name,
            status: 'SKIPPED',
            error: 'Approved unpaid commissions are below the minimum payout threshold',
          });
          continue;
        }

        // Try Beam Wallet instant payout first
        let beamResult = null;
        let payoutStatus = 'PENDING';
        let payoutMethod = 'AUTO';
        let payoutNotes = 'Auto-payout processed';

        if (beamConfigured) {
          try {
            beamResult = await beamWallet.sendPayout({
              ...getBeamRecipient(affiliate),
              amountCents: payoutAmountCents,
              currency: payoutCurrency,
              reference: `PAYOUT-${affiliate.id}-${Date.now()}`,
              description: `Beam Affiliate Payout for ${affiliate.user.name}`,
              metadata: {
                affiliate_id: affiliate.id,
                user_id: affiliate.user.id,
              },
            });

            if (beamResult.success && beamResult.status === 'completed') {
              payoutStatus = 'COMPLETED';
              payoutMethod = 'BEAM_WALLET';
              payoutNotes = `Instant Beam Wallet payout — Txn: ${beamResult.transactionId}`;
            } else {
              payoutStatus = 'PROCESSING';
              payoutMethod = 'BEAM_WALLET';
              payoutNotes = `Beam Wallet payout initiated — Txn: ${beamResult.transactionId}`;
            }
          } catch (beamErr) {
            // Beam failed — fall back to manual PENDING payout
            console.error(`Beam payout failed for ${affiliate.id}:`, beamErr);
            payoutNotes = `Auto-payout created (Beam Wallet delivery failed: ${(beamErr as Error).message})`;
          }
        }

        const payout = await prisma.$transaction(async (tx) => {
          const createdPayout = await tx.payout.create({
            data: {
              affiliateId: affiliate.id,
              userId: affiliate.user.id,
              amountCents: payoutAmountCents,
              commissionCount: payableCommissions.length,
              status: payoutStatus as any,
              method: payoutMethod,
              notes: payoutNotes,
              processedAt: payoutStatus === 'COMPLETED' ? new Date() : null,
              createdBy: admin.id,
            },
          });

          await tx.commission.updateMany({
            where: {
              id: { in: payableCommissions.map(c => c.id) },
            },
            data: {
              status: 'PAID',
              payoutId: createdPayout.id,
              paidAt: new Date(),
            },
          });

          const currentAffiliate = await tx.affiliate.findUnique({
            where: { id: affiliate.id },
            select: { balanceCents: true },
          });

          await tx.affiliate.update({
            where: { id: affiliate.id },
            data: {
              balanceCents: Math.max((currentAffiliate?.balanceCents || 0) - payoutAmountCents, 0),
            },
          });

          await tx.auditLog.create({
            data: {
              action: 'AUTO_PAYOUT_CREATED',
              actorId: admin.id,
              objectType: 'payout',
              objectId: createdPayout.id,
              payload: {
                affiliateId: affiliate.id,
                amountCents: payoutAmountCents,
                commissionCount: payableCommissions.length,
                method: payoutMethod,
                beamTransactionId: beamResult?.transactionId || null,
              },
            },
          });

          return createdPayout;
        });

        try {
          const { emailService } = await import('@/lib/email');
          await emailService.sendPayoutCreatedEmail(affiliate.user.email, {
            affiliateName: affiliate.user.name || 'Partner',
            amountCents: payoutAmountCents,
            commissionCount: payableCommissions.length,
            payoutId: payout.id,
            method: payoutMethod === 'BEAM_WALLET'
              ? 'Beam Wallet'
              : `${payoutFrequency.toLowerCase()} payment order`,
          });
        } catch (emailError) {
          console.error(`Failed to send auto-payout confirmation for ${affiliate.id}:`, emailError);
        }

        results.push({
          affiliateId: affiliate.id,
          name: affiliate.user.name,
          payoutId: payout.id,
          amountCents: payoutAmountCents,
          status: payoutStatus,
          beamTransactionId: beamResult?.transactionId,
        });

        totalProcessed++;
        totalAmountCents += payoutAmountCents;
      } catch (err) {
        results.push({
          affiliateId: affiliate.id,
          name: affiliate.user.name,
          status: 'FAILED',
          error: (err as Error).message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Auto-payout processed for ${totalProcessed} affiliates`,
      processed: totalProcessed,
      totalAmountCents,
      results,
    });
  } catch (error) {
    console.error('Auto-payout error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process auto-payouts' }, { status: 500 });
  }
}

// GET - Get auto-payout configuration and status
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const settings = await prisma.programSettings.findFirst();
    const payoutFrequency = settings?.payoutFrequency || 'MONTHLY';

    // Count eligible affiliates
    const minPayoutCents = settings?.minPayoutCents || 100000;
    const eligibleCount = await prisma.affiliate.count({
      where: {
        balanceCents: { gte: minPayoutCents },
        user: { status: 'ACTIVE' },
      },
    });

    const totalPendingBalance = await prisma.affiliate.aggregate({
      where: {
        balanceCents: { gte: minPayoutCents },
        user: { status: 'ACTIVE' },
      },
      _sum: { balanceCents: true },
    });

    // Recent auto-payouts
    const recentPayouts = await prisma.payout.findMany({
      where: { notes: { contains: 'Auto-payout' } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        affiliate: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });

    return NextResponse.json({
      success: true,
      config: {
        minPayoutCents,
        payoutFrequency,
        autoPayoutsEnabled: settings?.autoApprovePayouts || false,
        paymentOrderTypes: ['WEEKLY', 'MONTHLY'],
        instantBeamWalletConfigured: (await import('@/lib/beam-wallet')).beamWallet.isConfigured(),
      },
      stats: {
        eligibleAffiliates: eligibleCount,
        totalPendingCents: totalPendingBalance._sum?.balanceCents || 0,
      },
      recentPayouts,
    });
  } catch (error) {
    console.error('Auto-payout config error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch config' }, { status: 500 });
  }
}

function getBeamRecipient(affiliate: { user: { email: string }; payoutDetails: any }) {
  const details = affiliate.payoutDetails && typeof affiliate.payoutDetails === 'object'
    ? affiliate.payoutDetails
    : {};

  return {
    recipientEmail: details.beamEmail || details.email || affiliate.user.email,
    recipientPhone: details.phone || details.beamPhone || undefined,
    recipientBeamId: details.beamId || details.beamWalletId || undefined,
  };
}
