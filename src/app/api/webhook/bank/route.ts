import { NextRequest, NextResponse } from 'next/server';
import { completePendingCheckoutPayment } from '@/lib/payment-validation';

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.BANK_WEBHOOK_SECRET;
    const signature = request.headers.get('x-bank-signature');

    if (webhookSecret && signature !== webhookSecret) {
      return NextResponse.json({ error: 'Invalid bank webhook signature' }, { status: 401 });
    }

    const body = await request.json();
    const reference = body.remittance_reference || body.reference || body.bank_reference;
    const externalPaymentId = body.bank_transaction_id || body.transaction_id || body.id;
    const status = String(body.status || '').toLowerCase();

    if (!reference || !externalPaymentId) {
      return NextResponse.json(
        { error: 'Bank reference and transaction ID are required' },
        { status: 400 }
      );
    }

    if (!['booked', 'completed', 'paid', 'settled', 'success'].includes(status)) {
      return NextResponse.json({ received: true, ignored: true, status });
    }

    const result = await completePendingCheckoutPayment({
      reference,
      provider: 'bank_transfer',
      externalPaymentId,
      amountCents: body.amount_cents || body.amountCents,
      currency: body.currency,
      payerEmail: body.payer_email || body.payerEmail,
      rawPayload: body,
    });

    return NextResponse.json(result, { status: result.status });
  } catch (error) {
    console.error('Bank webhook error:', error);
    return NextResponse.json({ error: 'Bank webhook handler failed' }, { status: 500 });
  }
}
