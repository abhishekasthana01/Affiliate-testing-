import { prisma } from '@/lib/prisma';
import { calculateCommissionCents, normalizeCommissionRate } from '@/lib/commission';

type PaymentProvider = 'beam_wallet' | 'bank_transfer';

interface CompletePaymentInput {
  reference: string;
  provider: PaymentProvider;
  externalPaymentId: string;
  amountCents?: number;
  currency?: string;
  payerEmail?: string;
  rawPayload?: unknown;
}

export async function completePendingCheckoutPayment(input: CompletePaymentInput) {
  const transaction = await (prisma as any).transaction.findFirst({
    where: {
      invoiceId: input.reference,
      paymentMethod: input.provider,
      status: 'PENDING',
    },
    include: {
      affiliate: { include: { user: true, partnerGroup: true } },
      referral: true,
    },
  });

  if (!transaction) {
    return { success: false, status: 404, message: 'Pending payment reference not found' };
  }

  if (input.amountCents && input.amountCents !== transaction.amountCents) {
    await logPaymentValidation(transaction.affiliate.userId, transaction.id, 'PAYMENT_AMOUNT_MISMATCH', input);
    return { success: false, status: 409, message: 'Payment amount does not match checkout amount' };
  }

  const commissionRate = transaction.affiliate.commissionRateOverride !== null
    ? normalizeCommissionRate(transaction.affiliate.commissionRateOverride)
    : normalizeCommissionRate(transaction.affiliate.partnerGroup?.commissionRate);
  const commissionCents = calculateCommissionCents(transaction.amountCents, commissionRate);
  const paidAt = new Date();

  const conversion = await prisma.conversion.create({
    data: {
      affiliateId: transaction.affiliateId,
      referralId: transaction.referralId,
      eventType: 'PURCHASE',
      amountCents: transaction.amountCents,
      status: 'APPROVED',
      currency: input.currency?.toUpperCase() || 'EUR',
      eventMetadata: {
        paymentProvider: input.provider,
        paymentReference: input.reference,
        originalPaymentId: input.externalPaymentId,
        payerEmail: input.payerEmail || transaction.customerEmail,
        transactionId: transaction.id,
        rawPayload: input.rawPayload || null,
      },
    },
  });

  await prisma.commission.create({
    data: {
      conversionId: conversion.id,
      affiliateId: transaction.affiliateId,
      userId: transaction.affiliate.userId,
      amountCents: commissionCents,
      rate: commissionRate,
      status: 'PENDING',
      maturesAt: await getCommissionMaturityDate(),
    },
  });

  const completedTransaction = await (prisma as any).transaction.update({
    where: { id: transaction.id },
    data: {
      commissionCents,
      commissionRate,
      status: 'COMPLETED',
      paidAt,
      customerEmail: input.payerEmail || transaction.customerEmail,
      description: appendOriginalPaymentId(transaction.description, input.externalPaymentId),
    },
  });

  await logPaymentValidation(transaction.affiliate.userId, transaction.id, 'PAYMENT_VALIDATED', input);

  try {
    const { emailService } = await import('@/lib/email');
    await Promise.all([
      emailService.sendTransactionCreatedEmail(transaction.affiliate.user.email, {
        affiliateName: transaction.affiliate.user.name || 'Partner',
        customerName: transaction.customerName,
        amountCents: transaction.amountCents,
        commissionCents,
        commissionRate,
        transactionId: transaction.id,
      }),
      emailService.sendPaymentConfirmationEmail({
        customerName: transaction.customerName,
        customerEmail: input.payerEmail || transaction.customerEmail,
        productName: transaction.description || 'your order',
        amountCents: transaction.amountCents,
        paymentMethod: input.provider === 'beam_wallet' ? 'Beam Wallet' : 'Bank Transfer',
        reference: input.externalPaymentId,
      }),
    ]);
  } catch (error) {
    console.error('Payment validation email failed:', error);
  }

  return {
    success: true,
    status: 200,
    transaction: completedTransaction,
    conversion,
    commissionCents,
  };
}

async function getCommissionMaturityDate() {
  const settings = await prisma.programSettings.findFirst();
  const holdDays = (settings as any)?.commissionHoldDays ?? 30;
  const maturesAt = new Date();
  maturesAt.setDate(maturesAt.getDate() + holdDays);
  return maturesAt;
}

async function logPaymentValidation(
  actorId: string,
  transactionId: string,
  action: string,
  input: CompletePaymentInput
) {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      objectType: 'transaction',
      objectId: transactionId,
      payload: {
        provider: input.provider,
        reference: input.reference,
        originalPaymentId: input.externalPaymentId,
        amountCents: input.amountCents || null,
        currency: input.currency || null,
        payerEmail: input.payerEmail || null,
        rawPayload: input.rawPayload || null,
      },
    },
  });
}

function appendOriginalPaymentId(description: string | null, originalPaymentId: string) {
  const base = description || 'Validated payment';
  return base.includes(originalPaymentId)
    ? base
    : `${base} | Original payment ID: ${originalPaymentId}`;
}
