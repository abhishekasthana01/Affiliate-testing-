import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditAction } from '@/lib/audit';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Find the commission
    const commission = await prisma.commission.findUnique({
      where: { id: params.id },
      include: { affiliate: true }
    });

    if (!commission) {
      return NextResponse.json({ error: 'Commission not found' }, { status: 404 });
    }

    if (commission.status === 'PAID') {
      return NextResponse.json({ error: 'Cannot change status of a paid commission' }, { status: 400 });
    }

    // Update commission
    const updatedCommission = await prisma.commission.update({
      where: { id: params.id },
      data: {
        status,
        approvedAt: status === 'APPROVED' ? new Date() : null,
        approvedBy: status === 'APPROVED' ? user.id : null,
      }
    });

    // If approved, increment affiliate balance
    if (status === 'APPROVED' && commission.status !== 'APPROVED') {
      await prisma.affiliate.update({
        where: { id: commission.affiliateId },
        data: {
          balanceCents: { increment: commission.amountCents }
        }
      });
    } 
    // If rejecting an already approved commission, decrement balance
    else if (status === 'REJECTED' && commission.status === 'APPROVED') {
      await prisma.affiliate.update({
        where: { id: commission.affiliateId },
        data: {
          balanceCents: { decrement: commission.amountCents }
        }
      });
    }

    // Log action
    await logAuditAction({
      actorId: user.id,
      action: 'UPDATE_COMMISSION_STATUS',
      objectType: 'COMMISSION',
      objectId: params.id,
      payload: { oldStatus: commission.status, newStatus: status }
    });

    return NextResponse.json({
      success: true,
      message: `Commission ${status.toLowerCase()} successfully`,
      commission: updatedCommission
    });

  } catch (error) {
    console.error('Update commission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
