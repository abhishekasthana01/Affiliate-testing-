import { NextRequest, NextResponse } from 'next/server';
import { completePendingCheckoutPayment } from '@/lib/payment-validation';

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.BEAM_WEBHOOK_SECRET;
    const signature = request.headers.get('x-beam-signature');

    if (webhookSecret && signature !== webhookSecret) {
      return NextResponse.json({ error: 'Invalid Beam webhook signature' }, { status: 401 });
    }

    const body = await request.json();
    const reference = body.payment_reference || body.reference || body.invoice_id;
    const status = String(body.status || '').toLowerCase();
    const externalPaymentId = body.transaction_id || body.payment_id || body.id;

    if (!reference || !externalPaymentId) {
      return NextResponse.json(
        { error: 'Beam payment reference and transaction ID are required' },
        { status: 400 }
      );
    }

    if (!['completed', 'paid', 'succeeded', 'success'].includes(status)) {
      return NextResponse.json({ received: true, ignored: true, status });
    }

    const result = await completePendingCheckoutPayment({
      reference,
      provider: 'beam_wallet',
      externalPaymentId,
      amountCents: body.amount_cents || body.amountCents,
      currency: body.currency,
      payerEmail: body.payer_email || body.payerEmail,
      rawPayload: body,
    });

    return NextResponse.json(result, { status: result.status });
  } catch (error) {
    console.error('Beam webhook error:', error);
    return NextResponse.json({ error: 'Beam webhook handler failed' }, { status: 500 });
  }
}
