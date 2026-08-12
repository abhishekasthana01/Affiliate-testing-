export { POST } from '@/app/api/checkout/route';

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    service: 'payments',
    endpoints: {
      createPayment: '/api/payments',
      checkout: '/api/checkout',
      verify: '/api/checkout/verify',
      proofUpload: '/api/checkout/proof',
      stripeWebhook: '/api/webhook/stripe',
      beamWebhook: '/api/webhook/beam',
      bankWebhook: '/api/webhook/bank',
    },
  });
}
