import { NextRequest, NextResponse } from 'next/server';
import { UserStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizeCommissionRate } from '@/lib/commission';


// Update affiliate status
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
    const { status, notes, commissionRateOverride } = body;

    if (!status && commissionRateOverride === undefined) {
      return NextResponse.json(
        { error: 'Status or commission rate override is required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    if (
      commissionRateOverride !== undefined &&
      commissionRateOverride !== null &&
      (typeof commissionRateOverride !== 'number' || commissionRateOverride <= 0 || commissionRateOverride > 100)
    ) {
      return NextResponse.json(
        { error: 'Commission rate must be a positive number, e.g. 0.20 or 20 for 20%' },
        { status: 400 }
      );
    }

    const isCommissionRateUpdate = commissionRateOverride !== undefined;

    const affiliate = await prisma.affiliate.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        userId: true,
        commissionRateOverride: true,
        user: {
          select: {
            id: true,
            email: true,
            status: true,
          },
        },
      },
    });

    if (!affiliate) {
      return NextResponse.json(
        { error: 'Affiliate not found' },
        { status: 404 }
      );
    }

    const updatedUser = status
      ? await prisma.user.update({
          where: { id: affiliate.userId },
          data: {
            status: status as UserStatus
          }
        })
      : affiliate.user;

    const updatedAffiliate = isCommissionRateUpdate
      ? await prisma.affiliate.update({
          where: { id: params.id },
          data: {
            commissionRateOverride: commissionRateOverride === null
              ? null
              : normalizeCommissionRate(commissionRateOverride),
          },
        })
      : affiliate;

    const auditPayload: any = {
      oldStatus: affiliate.user.status,
      newStatus: status || affiliate.user.status,
      notes: notes || null,
      affiliateEmail: affiliate.user.email,
    };

    if (isCommissionRateUpdate) {
      auditPayload.oldCommissionRateOverride = affiliate.commissionRateOverride;
      auditPayload.newCommissionRateOverride = updatedAffiliate.commissionRateOverride;
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: isCommissionRateUpdate ? 'UPDATE_AFFILIATE_COMMISSION_RATE' : 'UPDATE_AFFILIATE_STATUS',
        objectType: 'AFFILIATE',
        objectId: params.id,
        payload: auditPayload
      }
    });

    return NextResponse.json({
      success: true,
      message: isCommissionRateUpdate
        ? 'Affiliate commission rate updated'
        : `Affiliate status updated to ${status}`,
      affiliate: {
        id: affiliate.id,
        userId: updatedUser.id,
        status: updatedUser.status,
        ...(isCommissionRateUpdate && {
          commissionRateOverride: updatedAffiliate.commissionRateOverride,
        })
      }
    });

  } catch (error) {
    console.error('Update affiliate status error:', error);
    return NextResponse.json(
      { error: 'Failed to update affiliate status' },
      { status: 500 }
    );
  }
}

// Delete affiliate
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

    // Get affiliate to find userId
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: params.id },
      include: { user: true }
    });

    if (!affiliate) {
      return NextResponse.json(
        { error: 'Affiliate not found' },
        { status: 404 }
      );
    }

    // Delete user (will cascade delete affiliate due to Prisma schema)
    await prisma.user.delete({
      where: { id: affiliate.userId }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'DELETE_AFFILIATE',
        objectType: 'AFFILIATE',
        objectId: params.id,
        payload: {
          affiliateName: affiliate.user.name,
          affiliateEmail: affiliate.user.email,
          referralCode: affiliate.referralCode
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Affiliate deleted successfully'
    });

  } catch (error) {
    console.error('Delete affiliate error:', error);
    return NextResponse.json(
      { error: 'Failed to delete affiliate' },
      { status: 500 }
    );
  }
}
