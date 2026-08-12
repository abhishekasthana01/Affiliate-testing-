import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateCommissionCents, normalizeCommissionRate } from '@/lib/commission';


export async function PUT(
  request: NextRequest, 
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
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

    const body = await request.json();
    const { action, reviewNotes } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    const referral = await prisma.referral.findUnique({
      where: { id: params.id },
      include: {
        affiliate: {
          include: { partnerGroup: true }
        }
      }
    });

    if (!referral) {
      return NextResponse.json(
        { error: 'Referral not found' },
        { status: 404 }
      );
    }

    if (referral.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Referral has already been ${referral.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Get estimated value from referral metadata
    const metadata = referral.metadata as Record<string, any> || {};
    const estimatedValueCents = Number(metadata?.estimated_value) * 100 || 10000;

    const updatedReferral = await prisma.referral.update({
      where: { id: params.id },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        reviewNotes: reviewNotes || null,
        reviewedBy: user.id,
        reviewedAt: new Date()
      }
    });

    // If approved, create conversion and commission
    if (action === 'approve') {
      const commissionRate = referral.affiliate.commissionRateOverride !== null
        ? normalizeCommissionRate(referral.affiliate.commissionRateOverride)
        : normalizeCommissionRate(referral.affiliate.partnerGroup?.commissionRate);

      const conversion = await prisma.conversion.create({
        data: {
          affiliateId: referral.affiliateId,
          referralId: referral.id,
          eventType: 'PURCHASE',
          amountCents: estimatedValueCents,
          status: 'PENDING'
        }
      });

      const commissionAmount = calculateCommissionCents(estimatedValueCents, commissionRate);
      
      // Set maturity date (default 30 days, or immediate for testing if desired)
      const maturesAt = new Date();
      maturesAt.setDate(maturesAt.getDate() + 30);

      await prisma.commission.create({
        data: {
          affiliateId: referral.affiliateId,
          conversionId: conversion.id,
          userId: referral.affiliate.userId,
          rate: commissionRate,
          amountCents: commissionAmount,
          status: 'PENDING',
          maturesAt
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Referral ${action}d successfully`,
      referral: updatedReferral
    });

  } catch (error) {
    console.error('Referral approval error:', error);
    return NextResponse.json(
      { error: 'Failed to process referral' },
      { status: 500 }
    );
  }
}

// Add PATCH method for updating referral/customer details
export async function PATCH(
  request: NextRequest, 
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
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

    const body = await request.json();
    const { action, leadName, leadEmail, status, reviewNotes } = body;

    // Check if referral exists
    const referral = await prisma.referral.findUnique({
      where: { id: params.id },
      include: { affiliate: { include: { partnerGroup: true } } }
    });

    if (!referral) {
      return NextResponse.json(
        { error: 'Referral not found' },
        { status: 404 }
      );
    }

    // If action is provided, handle approve/reject (legacy behavior)
    if (action && ['approve', 'reject'].includes(action)) {
      if (referral.status !== 'PENDING') {
        return NextResponse.json(
          { error: `Referral has already been ${referral.status.toLowerCase()}` },
          { status: 400 }
        );
      }

      const updatedReferral = await prisma.referral.update({
        where: { id: params.id },
        data: {
          status: action === 'approve' ? 'APPROVED' : 'REJECTED',
          reviewNotes: reviewNotes || null,
          reviewedBy: user.id,
          reviewedAt: new Date()
        }
      });

      // If approved, create conversion and commission
      if (action === 'approve') {
        const refMetadata = referral.metadata as Record<string, any> || {};
        const estValueCents = Number(refMetadata?.estimated_value) * 100 || 10000;
        const commissionRate = referral.affiliate.commissionRateOverride !== null
          ? normalizeCommissionRate(referral.affiliate.commissionRateOverride)
          : normalizeCommissionRate(referral.affiliate.partnerGroup?.commissionRate);

        const conversion = await prisma.conversion.create({
          data: {
            affiliateId: referral.affiliateId,
            referralId: referral.id,
            eventType: 'PURCHASE',
            amountCents: estValueCents,
            status: 'PENDING'
          }
        });

        const commissionAmount = calculateCommissionCents(estValueCents, commissionRate);
        
        await prisma.commission.create({
          data: {
            affiliateId: referral.affiliateId,
            conversionId: conversion.id,
            userId: referral.affiliate.userId,
            rate: commissionRate,
            amountCents: commissionAmount,
            status: 'PENDING'
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: `Referral ${action}d successfully`,
        referral: updatedReferral
      });
    }

    // Otherwise, handle customer detail updates
    const updateData: any = {};
    
    if (leadName !== undefined) updateData.leadName = leadName;
    if (leadEmail !== undefined) updateData.leadEmail = leadEmail;
    if (status !== undefined) {
      // Map status values
      updateData.status = status;
      updateData.reviewedBy = user.id;
      updateData.reviewedAt = new Date();
    }

    const updatedReferral = await prisma.referral.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message: 'Customer updated successfully',
      referral: updatedReferral
    });

  } catch (error) {
    console.error('Update referral error:', error);
    return NextResponse.json(
      { error: 'Failed to update referral' },
      { status: 500 }
    );
  }
}

// Add DELETE method to allow admins to delete referrals
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
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

    // Check if referral exists and collect records that feed dashboards.
    const referral = await prisma.referral.findUnique({
      where: { id: params.id },
      include: {
        conversions: {
          include: {
            commissions: true,
          },
        },
        transactions: true,
      },
    });

    if (!referral) {
      return NextResponse.json(
        { error: 'Referral not found' },
        { status: 404 }
      );
    }

    const relatedCommissions = referral.conversions.flatMap((conversion) => conversion.commissions);
    const commissionIds = relatedCommissions.map((commission) => commission.id);
    const transactionIds = referral.transactions.map((transaction) => transaction.id);
    const approvedBalanceCents = relatedCommissions
      .filter((commission) => commission.status === 'APPROVED')
      .reduce((sum, commission) => sum + commission.amountCents, 0);

    const payoutAdjustments = relatedCommissions.reduce((map, commission) => {
      if (!commission.payoutId) return map;
      const current = map.get(commission.payoutId) || { amountCents: 0, commissionCount: 0 };
      map.set(commission.payoutId, {
        amountCents: current.amountCents + commission.amountCents,
        commissionCount: current.commissionCount + 1,
      });
      return map;
    }, new Map<string, { amountCents: number; commissionCount: number }>());

    await prisma.$transaction(async (tx) => {
      for (const [payoutId, adjustment] of payoutAdjustments) {
        const remainingCommissionCount = await tx.commission.count({
          where: {
            payoutId,
            id: { notIn: commissionIds },
          },
        });

        if (remainingCommissionCount > 0) {
          await tx.payout.update({
            where: { id: payoutId },
            data: {
              amountCents: { decrement: adjustment.amountCents },
              commissionCount: { decrement: adjustment.commissionCount },
            },
          });
        }
      }

      if (transactionIds.length > 0) {
        await tx.manualPaymentProof.deleteMany({
          where: {
            transactionId: { in: transactionIds },
          },
        });
      }

      await tx.transaction.deleteMany({
        where: { referralId: params.id },
      });

      if (commissionIds.length > 0) {
        await tx.commission.deleteMany({
          where: { id: { in: commissionIds } },
        });
      }

      if (referral.conversions.length > 0) {
        await tx.conversion.deleteMany({
          where: { referralId: params.id },
        });
      }

      for (const [payoutId] of payoutAdjustments) {
        const remainingCommissionCount = await tx.commission.count({
          where: { payoutId },
        });

        if (remainingCommissionCount === 0) {
          await tx.payout.delete({
            where: { id: payoutId },
          });
        }
      }

      if (approvedBalanceCents > 0) {
        const affiliate = await tx.affiliate.findUnique({
          where: { id: referral.affiliateId },
          select: { balanceCents: true },
        });

        await tx.affiliate.update({
          where: { id: referral.affiliateId },
          data: {
            balanceCents: Math.max((affiliate?.balanceCents || 0) - approvedBalanceCents, 0),
          },
        });
      }

      await tx.referral.delete({
        where: { id: params.id },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Referral and related dashboard records deleted successfully'
    });

  } catch (error) {
    console.error('Delete referral error:', error);
    return NextResponse.json(
      { error: 'Failed to delete referral' },
      { status: 500 }
    );
  }
}
