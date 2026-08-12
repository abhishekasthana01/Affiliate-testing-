import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateCommissionCents, normalizeCommissionRate } from '@/lib/commission';


export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!;
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    // Get all referrals with affiliate information
    const referrals = await prisma.referral.findMany({
      include: {
        affiliate: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Get all partner groups for commission rate lookup
    const partnerGroups = await prisma.partnerGroup.findMany();
    const partnerGroupMap = new Map(
      partnerGroups.map(pg => [pg.id, { name: pg.name, rate: normalizeCommissionRate(pg.commissionRate) }])
    );

    return NextResponse.json({
      success: true,
      referrals: referrals.map(referral => {
        const metadata = referral.metadata as any;
        const affiliate = referral.affiliate as any;
        const pgId = affiliate.partnerGroupId;
        const pgData = pgId ? partnerGroupMap.get(pgId) : null;
        
        return {
          id: referral.id,
          leadEmail: referral.leadEmail,
          leadName: referral.leadName,
          leadPhone: referral.leadPhone,
          status: referral.status,
          notes: referral.notes,
          createdAt: referral.createdAt,
          estimatedValue: Number(metadata?.estimated_value) || 0,
          company: metadata?.company || '',
          affiliate: {
            id: affiliate.id,
            name: affiliate.user.name,
            email: affiliate.user.email,
            referralCode: affiliate.referralCode,
            partnerGroup: pgData?.name || 'Default',
            partnerGroupId: pgId,
            commissionRate: pgData?.rate || 0.20
          }
        };
      })
    });

  } catch (error) {
    console.error('Admin referrals API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referrals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!;
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { referralIds, action } = body; // action: 'approve' | 'reject'

    if (!referralIds || !Array.isArray(referralIds) || referralIds.length === 0) {
      return NextResponse.json(
        { error: 'Referral IDs array is required' },
        { status: 400 }
      );
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Update multiple referrals and create commissions for approved ones
    const result = await prisma.$transaction(async (tx) => {
      const referrals = await tx.referral.findMany({
        where: {
          id: { in: referralIds },
          status: 'PENDING'
        },
        include: {
          affiliate: {
            include: { partnerGroup: true }
          }
        }
      });

      if (referrals.length === 0) return 0;

      // Update referral statuses
      await tx.referral.updateMany({
        where: { id: { in: referrals.map(r => r.id) } },
        data: {
          status: action === 'approve' ? 'APPROVED' : 'REJECTED',
          reviewedBy: user.id,
          reviewedAt: new Date()
        }
      });

      if (action === 'approve') {
        for (const referral of referrals) {
          const metadata = referral.metadata as Record<string, any> || {};
          const estimatedValueCents = Number(metadata?.estimated_value) * 100 || 10000;
          
          const commissionRate = referral.affiliate.commissionRateOverride !== null
            ? normalizeCommissionRate(referral.affiliate.commissionRateOverride)
            : normalizeCommissionRate(referral.affiliate.partnerGroup?.commissionRate);

          const conversion = await tx.conversion.create({
            data: {
              affiliateId: referral.affiliateId,
              referralId: referral.id,
              eventType: 'PURCHASE',
              amountCents: estimatedValueCents,
              status: 'PENDING'
            }
          });

          const commissionAmount = calculateCommissionCents(estimatedValueCents, commissionRate);
          const maturesAt = new Date();
          maturesAt.setDate(maturesAt.getDate() + 30);

          await tx.commission.create({
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
      }

      return referrals.length;
    });

    return NextResponse.json({
      success: true,
      message: `${result} referrals ${action}d successfully`,
      updatedCount: result
    });

  } catch (error) {
    console.error('Batch referral API error:', error);
    return NextResponse.json(
      { error: 'Failed to process referrals' },
      { status: 500 }
    );
  }
}
