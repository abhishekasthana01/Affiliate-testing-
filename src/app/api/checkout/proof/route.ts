import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const data = contentType.includes('multipart/form-data')
      ? await parseFormData(request)
      : await request.json();

    const reference = String(data.reference || '').trim();
    const customerEmail = String(data.customerEmail || data.email || '').trim().toLowerCase();

    if (!reference || !customerEmail) {
      return NextResponse.json(
        { error: 'Payment reference and email are required' },
        { status: 400 }
      );
    }

    const transaction = await (prisma as any).transaction.findFirst({
      where: {
        invoiceId: reference,
        customerEmail,
        status: 'PENDING',
      },
      select: { id: true, paymentMethod: true, amountCents: true },
    });

    const proof = await (prisma as any).manualPaymentProof.create({
      data: {
        transactionId: transaction?.id || null,
        reference,
        customerEmail,
        proofUrl: data.proofUrl || null,
        fileName: data.fileName || null,
        fileSize: data.fileSize || null,
        mimeType: data.mimeType || null,
        notes: data.notes || null,
        status: 'PENDING_REVIEW',
        metadata: {
          paymentMethod: transaction?.paymentMethod || null,
          amountCents: transaction?.amountCents || null,
          submittedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      proof,
      message: transaction
        ? 'Proof submitted for review'
        : 'Proof submitted, but no pending payment matched this reference and email',
    });
  } catch (error) {
    console.error('Payment proof submission error:', error);
    return NextResponse.json({ error: 'Failed to submit payment proof' }, { status: 500 });
  }
}

async function parseFormData(request: NextRequest) {
  const form = await request.formData();
  const file = form.get('proofFile');

  return {
    reference: form.get('reference'),
    customerEmail: form.get('customerEmail'),
    proofUrl: form.get('proofUrl'),
    notes: form.get('notes'),
    fileName: file instanceof File ? file.name : null,
    fileSize: file instanceof File ? file.size : null,
    mimeType: file instanceof File ? file.type : null,
  };
}
