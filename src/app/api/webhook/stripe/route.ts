import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateCommissionCents, normalizeCommissionRate } from '@/lib/commission';

/**
 * POST /api/webhook/stripe — Stripe webhook handler
 * Handles payment_intent.succeeded events and creates conversions/commissions
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not set');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    // Verify and parse the event
    const { verifyWebhookSignature } = await import('@/lib/stripe');
    let event;
    try {
      event = verifyWebhookSignature(rawBody, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as any;
      const meta = paymentIntent.metadata || {};

      const referralCode = meta.referral_code;
      const resellerId = meta.reseller_id;
      const customerEmail = meta.customer_email || paymentIntent.receipt_email;
      const customerName = meta.customer_name || 'Customer';
      const productName = meta.product_name || '';
      const amountCents = paymentIntent.amount;

      if (!customerEmail) {
        console.warn(`Stripe payment ${paymentIntent.id} has no customer email; skipping affiliate attribution`);
        return NextResponse.json({ received: true });
      }

      const existingTransaction = await (prisma as any).transaction.findFirst({
        where: { invoiceId: paymentIntent.id },
      });

      if (existingTransaction) {
        return NextResponse.json({ received: true, duplicate: true });
      }

      // Look up affiliate
      let affiliate = null;
      if (resellerId || referralCode) {
        affiliate = await prisma.affiliate.findFirst({
          where: {
            OR: [
              ...(resellerId ? [{ resellerId }] : []),
              ...(referralCode ? [{ referralCode }] : []),
            ],
          },
          include: { user: true },
        });
      }

      if (affiliate) {
        // Get or create referral
        let referral = await prisma.referral.findFirst({
          where: { affiliateId: affiliate.id, leadEmail: customerEmail },
        });

        if (!referral) {
          referral = await prisma.referral.create({
            data: {
              affiliateId: affiliate.id,
              leadName: customerName,
              leadEmail: customerEmail,
              status: 'APPROVED',
              metadata: { source: 'stripe_payment', paymentIntentId: paymentIntent.id },
            },
          });
        }

        // Get commission rate from partner group or default
        let commissionRate = normalizeCommissionRate((affiliate as any).commissionRateOverride);
        if ((affiliate as any).commissionRateOverride === null && affiliate.partnerGroupId) {
          const group = await prisma.partnerGroup.findUnique({
            where: { id: affiliate.partnerGroupId },
          });
          if (group) commissionRate = normalizeCommissionRate(group.commissionRate);
        }

        const commissionCents = calculateCommissionCents(amountCents, commissionRate);

        // Create transaction record
        const transaction = await (prisma as any).transaction.create({
          data: {
            referralId: referral.id,
            affiliateId: affiliate.id,
            customerId: paymentIntent.customer || null,
            customerName,
            customerEmail,
            amountCents,
            commissionCents,
            commissionRate,
            status: 'COMPLETED',
            description: productName ? `Payment for ${productName}` : 'Stripe payment',
            paymentMethod: 'stripe',
            invoiceId: paymentIntent.id,
            paidAt: new Date(),
            createdBy: 'stripe-webhook',
          },
        });

        // Create conversion
        const conversion = await prisma.conversion.create({
          data: {
            affiliateId: affiliate.id,
            referralId: referral.id,
            eventType: 'PURCHASE',
            amountCents,
            status: 'APPROVED',
            currency: paymentIntent.currency?.toUpperCase() || 'EUR',
            eventMetadata: {
              paymentIntentId: paymentIntent.id,
              productName,
              commissionCents,
              commissionRate,
            },
          },
        });

        // Create commission with hold period
        const settings = await prisma.programSettings.findFirst();
        const holdDays = (settings as any)?.commissionHoldDays ?? 30;
        const maturesAt = new Date();
        maturesAt.setDate(maturesAt.getDate() + holdDays);

        await prisma.commission.create({
          data: {
            conversionId: conversion.id,
            affiliateId: affiliate.id,
            userId: affiliate.userId,
            amountCents: commissionCents,
            rate: commissionRate,
            status: 'PENDING',
            maturesAt,
          },
        });

        await prisma.auditLog.create({
          data: {
            actorId: affiliate.userId,
            action: 'PAYMENT_VALIDATED',
            objectType: 'transaction',
            objectId: transaction.id,
            payload: {
              provider: 'stripe',
              originalPaymentId: paymentIntent.id,
              chargeId: paymentIntent.latest_charge || null,
              amountCents,
              currency: paymentIntent.currency,
              resellerId: affiliate.resellerId,
              referralCode: affiliate.referralCode,
            },
          },
        });

        try {
          const { emailService } = await import('@/lib/email');
          await Promise.all([
            emailService.sendTransactionCreatedEmail(affiliate.user.email, {
              affiliateName: affiliate.user.name || 'Partner',
              customerName,
              amountCents,
              commissionCents,
              commissionRate,
              transactionId: transaction.id,
            }),
            emailService.sendPaymentConfirmationEmail({
              customerName,
              customerEmail,
              productName: productName || 'your order',
              amountCents,
              paymentMethod: 'Card',
              reference: paymentIntent.id,
            }),
          ]);
        } catch (emailError) {
          console.error('Failed to send Stripe payment confirmation email:', emailError);
        }

        console.log(`✅ Stripe payment processed: ${customerEmail} → ${affiliate.referralCode} (${commissionCents}c commission)`);
      } else {
        try {
          const { emailService } = await import('@/lib/email');
          await emailService.sendPaymentConfirmationEmail({
            customerName,
            customerEmail,
            productName: productName || 'your order',
            amountCents,
            paymentMethod: 'Card',
            reference: paymentIntent.id,
          });
        } catch (emailError) {
          console.error('Failed to send unattributed Stripe payment confirmation email:', emailError);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
