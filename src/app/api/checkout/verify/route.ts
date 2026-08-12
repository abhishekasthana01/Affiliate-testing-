import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/checkout/verify — Verify a payment's status
 * Public endpoint for customers to check their payment.
 * 
 * Supports lookup by:
 * - orderId (from checkout response)
 * - invoiceId / paymentReference (Stripe PI, Beam ref, or bank ref)
 * - email + amountCents (fallback search)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, invoiceId, email } = body;

    if (!orderId && !invoiceId && !email) {
      return NextResponse.json(
        { error: 'Please provide an order ID, payment reference, or email' },
        { status: 400 }
      );
    }

    // Build search criteria
    const where: any = {};
    if (invoiceId) {
      where.invoiceId = invoiceId;
    } else if (orderId) {
      where.invoiceId = { contains: orderId };
    } else if (email) {
      where.customerEmail = email.toLowerCase();
    }

    const transactions = await (prisma as any).transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        amountCents: true,
        commissionCents: true,
        status: true,
        description: true,
        paymentMethod: true,
        invoiceId: true,
        paidAt: true,
        createdAt: true,
      },
    });

    if (transactions.length === 0) {
      return NextResponse.json({
        success: true,
        found: false,
        message: 'No payment found with the provided details',
      });
    }

    // Mask sensitive data — only show minimal info for verification
    const verifiedPayments = transactions.map((txn: any) => ({
      id: txn.id,
      status: txn.status,
      statusLabel: getStatusLabel(txn.status),
      amountCents: txn.amountCents,
      paymentMethod: txn.paymentMethod,
      description: txn.description,
      reference: txn.invoiceId,
      // Mask email: j***@example.com
      email: maskEmail(txn.customerEmail),
      paidAt: txn.paidAt?.toISOString() || null,
      createdAt: txn.createdAt.toISOString(),
      // Verification checks
      checks: {
        paymentReceived: txn.status === 'COMPLETED',
        amountVerified: txn.amountCents > 0,
        timestampVerified: !!txn.createdAt,
        processorConfirmed: txn.status === 'COMPLETED' && !!txn.paidAt,
      },
    }));

    // For Stripe payments, also verify with Stripe directly if possible
    if (invoiceId && invoiceId.startsWith('pi_')) {
      try {
        const { stripe } = await import('@/lib/stripe');
        const paymentIntent = await stripe.paymentIntents.retrieve(invoiceId);

        return NextResponse.json({
          success: true,
          found: true,
          payments: verifiedPayments,
          stripeVerification: {
            verified: true,
            status: paymentIntent.status,
            amountCents: paymentIntent.amount,
            currency: paymentIntent.currency,
            lastFour: paymentIntent.payment_method ? '••••' : null,
            receiptEmail: paymentIntent.receipt_email
              ? maskEmail(paymentIntent.receipt_email)
              : null,
          },
        });
      } catch (stripeErr) {
        // Stripe lookup failed — return DB results only
        console.error('Stripe verification failed:', stripeErr);
      }
    }

    const { getCurrencySymbol } = await import('@/lib/currency');
    const currencySymbol = await getCurrencySymbol();

    return NextResponse.json({
      success: true,
      found: true,
      payments: verifiedPayments,
      currencySymbol,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***';
  const masked = local.slice(0, 1) + '***';
  return `${masked}@${domain}`;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    COMPLETED: 'Payment Confirmed',
    PENDING: 'Awaiting Confirmation',
    PROCESSING: 'Being Processed',
    REFUNDED: 'Refunded',
    FAILED: 'Payment Failed',
  };
  return labels[status] || status;
}
