import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { completePendingCheckoutPayment } from '@/lib/payment-validation';

async function verifyAdmin(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (user.role as string !== 'ADMIN')) return null;
  return user;
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;

  const proofs = await (prisma as any).manualPaymentProof.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ success: true, proofs });
}

export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, status, reviewNotes, externalPaymentId } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Proof ID and status are required' }, { status: 400 });
    }

    const proof = await (prisma as any).manualPaymentProof.update({
      where: { id },
      data: {
        status,
        reviewedBy: admin.id,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      },
    });

    let validation = null;
    if (status === 'APPROVED') {
      const transaction = await (prisma as any).transaction.findFirst({
        where: { invoiceId: proof.reference },
        select: { paymentMethod: true, amountCents: true },
      });

      if (transaction?.paymentMethod === 'beam_wallet' || transaction?.paymentMethod === 'bank_transfer') {
        validation = await completePendingCheckoutPayment({
          reference: proof.reference,
          provider: transaction.paymentMethod,
          externalPaymentId: externalPaymentId || `manual-proof-${proof.id}`,
          amountCents: transaction.amountCents,
          payerEmail: proof.customerEmail,
          rawPayload: {
            source: 'manual_proof_review',
            proofId: proof.id,
            reviewedBy: admin.id,
            reviewNotes: reviewNotes || null,
          },
        });
      }
    }

    return NextResponse.json({ success: true, proof, validation });
  } catch (error) {
    console.error('Payment proof review error:', error);
    return NextResponse.json({ error: 'Failed to update payment proof' }, { status: 500 });
  }
}
