import Stripe from 'stripe';

// Server-side Stripe instance
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-04-22.dahlia',
});

export { stripe };

/**
 * Create a Stripe Payment Intent for a product purchase
 */
export async function createPaymentIntent({
  amountCents,
  currency = 'eur',
  customerEmail,
  customerName,
  productName,
  referralCode,
  metadata = {},
}: {
  amountCents: number;
  currency?: string;
  customerEmail: string;
  customerName?: string;
  productName?: string;
  referralCode?: string;
  metadata?: Record<string, string>;
}) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    receipt_email: customerEmail,
    metadata: {
      customer_email: customerEmail,
      customer_name: customerName || '',
      product_name: productName || '',
      referral_code: referralCode || '',
      payment_method_type: 'stripe',
      ...metadata,
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return paymentIntent;
}

/**
 * Verify a Stripe webhook event signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
