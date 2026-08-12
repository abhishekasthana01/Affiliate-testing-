import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/checkout — Create a payment session
 * Supports: stripe, beam_wallet, bank_transfer
 * 
 * This is a PUBLIC endpoint — no auth required (customers aren't logged in).
 * Affiliate attribution comes from the referral code in the request.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productId,
      customerEmail,
      customerName,
      paymentMethod, // 'stripe' | 'beam_wallet' | 'bank_transfer'
      referralCode,  // from ?ref= query param or cookie
      resellerId,    // preferred strict Beam reseller identifier
    } = body;

    if (!productId || !customerEmail || !paymentMethod) {
      return NextResponse.json(
        { error: 'Product ID, customer email, and payment method are required' },
        { status: 400 }
      );
    }

    // Get product
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) {
      return NextResponse.json({ error: 'Product not found or inactive' }, { status: 404 });
    }

    // Look up affiliate from referral code (if provided)
    let affiliate = null;
    if (resellerId || referralCode) {
      affiliate = await prisma.affiliate.findFirst({
        where: {
          OR: [
            ...(resellerId ? [{ resellerId }] : []),
            ...(referralCode ? [{ referralCode }] : []),
          ],
        },
        include: { user: { select: { id: true, name: true, status: true } } },
      });
    }

    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // Handle different payment methods
    if (paymentMethod === 'stripe') {
      const { createPaymentIntent } = await import('@/lib/stripe');

      const paymentIntent = await createPaymentIntent({
        amountCents: product.priceCents,
        currency: product.currency.toLowerCase(),
        customerEmail,
        customerName,
        productName: product.name,
        referralCode: affiliate?.referralCode || referralCode || '',
        metadata: {
          order_id: orderId,
          product_id: product.id,
          product_slug: product.slug,
          affiliate_id: affiliate?.id || '',
          reseller_id: affiliate?.resellerId || resellerId || '',
        },
      });

      return NextResponse.json({
        success: true,
        paymentMethod: 'stripe',
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        orderId,
        amount: product.priceCents,
        currency: product.currency,
      });
    }

    if (paymentMethod === 'beam_wallet') {
      // Beam Wallet — generate a payment reference for the customer
      const beamPaymentRef = `BEAM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      await createPendingCheckoutTransaction({
        affiliate,
        customerEmail,
        customerName,
        amountCents: product.priceCents,
        description: `${product.name} - Beam Wallet`,
        paymentMethod: 'beam_wallet',
        invoiceId: beamPaymentRef,
      });

      return NextResponse.json({
        success: true,
        paymentMethod: 'beam_wallet',
        paymentReference: beamPaymentRef,
        orderId,
        amount: product.priceCents,
        currency: product.currency,
        instructions: 'Complete the payment in your Beam Wallet app using the payment reference above.',
      });
    }

    if (paymentMethod === 'bank_transfer') {
      const bankRef = `BT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      await createPendingCheckoutTransaction({
        affiliate,
        customerEmail,
        customerName,
        amountCents: product.priceCents,
        description: `${product.name} - Bank Transfer`,
        paymentMethod: 'bank_transfer',
        invoiceId: bankRef,
      });

      return NextResponse.json({
        success: true,
        paymentMethod: 'bank_transfer',
        bankReference: bankRef,
        orderId,
        amount: product.priceCents,
        currency: product.currency,
        bankDetails: {
          accountName: process.env.BANK_ACCOUNT_NAME || 'Beam Technologies Ltd',
          iban: process.env.BANK_IBAN || 'IE29 AIBK 9311 5212 3456 78',
          bic: process.env.BANK_BIC || 'AIBKIE2D',
          reference: bankRef,
        },
        instructions: 'Transfer the exact amount using the bank reference as the payment reference. Processing takes 1-3 business days.',
      });
    }

    return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Payment processing failed' }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────

async function getOrCreateReferral(affiliateId: string, email: string, name: string) {
  let referral = await prisma.referral.findFirst({
    where: { affiliateId, leadEmail: email },
  });
  if (!referral) {
    referral = await prisma.referral.create({
      data: {
        affiliateId,
        leadName: name,
        leadEmail: email,
        status: 'APPROVED',
        metadata: { source: 'checkout' },
      },
    });
  }
  return referral;
}

async function createPendingCheckoutTransaction({
  affiliate,
  customerEmail,
  customerName,
  amountCents,
  description,
  paymentMethod,
  invoiceId,
}: {
  affiliate: any;
  customerEmail: string;
  customerName?: string;
  amountCents: number;
  description: string;
  paymentMethod: 'beam_wallet' | 'bank_transfer';
  invoiceId: string;
}) {
  const fallbackAffiliateId = affiliate?.id || await getSystemAffiliateId();
  const referralId = affiliate
    ? (await getOrCreateReferral(affiliate.id, customerEmail, customerName || 'Customer')).id
    : await createUnattributedReferralId(customerEmail, customerName);

  return (prisma as any).transaction.create({
    data: {
      referralId,
      affiliateId: fallbackAffiliateId,
      customerName: customerName || 'Customer',
      customerEmail,
      amountCents,
      commissionCents: 0,
      commissionRate: 0,
      status: 'PENDING',
      description,
      paymentMethod,
      invoiceId,
      createdBy: 'checkout',
    },
  });
}

async function createUnattributedReferralId(email: string, name?: string) {
  // For purchases without affiliate attribution, we still need a referral record
  // Use the first affiliate as system placeholder
  const systemAffiliate = await prisma.affiliate.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!systemAffiliate) throw new Error('No affiliates exist in the system');

  const referral = await prisma.referral.create({
    data: {
      affiliateId: systemAffiliate.id,
      leadName: name || 'Direct Customer',
      leadEmail: email,
      status: 'APPROVED',
      metadata: { source: 'checkout', unattributed: true },
    },
  });
  return referral.id;
}

async function getSystemAffiliateId() {
  const systemAffiliate = await prisma.affiliate.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!systemAffiliate) throw new Error('No affiliates exist in the system');
  return systemAffiliate.id;
}
