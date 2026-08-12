'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
  CreditCard,
  Wallet,
  Building2,
  Loader2,
  Lock,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BeamLogo } from '@/components/ui/BeamLogo';

interface VerificationCheck {
  paymentReceived: boolean;
  amountVerified: boolean;
  timestampVerified: boolean;
  processorConfirmed: boolean;
}

interface Payment {
  id: string;
  status: string;
  statusLabel: string;
  amountCents: number;
  paymentMethod: string;
  description: string;
  reference: string;
  email: string;
  paidAt: string | null;
  createdAt: string;
  checks: VerificationCheck;
}

export default function VerifyPaymentPage() {
  const [searchType, setSearchType] = useState<'reference' | 'email'>('reference');
  const [referenceInput, setReferenceInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('€');

  const handleVerify = async () => {
    const hasInput =
      searchType === 'reference' ? referenceInput.trim() : emailInput.trim();
    if (!hasInput) {
      setError('Please enter a value to search');
      return;
    }

    setLoading(true);
    setError('');
    setPayments(null);
    setNotFound(false);

    try {
      const body: any = {};
      if (searchType === 'reference') {
        // Auto-detect: Stripe PI, Beam ref, Bank ref, or Order ID
        const ref = referenceInput.trim();
        if (ref.startsWith('pi_')) {
          body.invoiceId = ref;
        } else if (ref.startsWith('BEAM-') || ref.startsWith('BT-')) {
          body.invoiceId = ref;
        } else {
          body.orderId = ref;
        }
      } else {
        body.email = emailInput.trim().toLowerCase();
      }

      const res = await fetch('/api/checkout/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      if (data.found) {
        setPayments(data.payments);
        setCurrencySymbol(data.currencySymbol || '€');
      } else {
        setNotFound(true);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) =>
    `${currencySymbol}${(cents / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-IE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'PENDING':
      case 'PROCESSING':
        return <Clock className="h-5 w-5 text-amber-500" />;
      case 'REFUNDED':
        return <Ban className="h-5 w-5 text-red-500" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PENDING':
      case 'PROCESSING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'REFUNDED':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getMethodIcon = (method: string | null) => {
    switch (method) {
      case 'stripe':
        return <CreditCard className="h-4 w-4" />;
      case 'beam_wallet':
        return <Wallet className="h-4 w-4" />;
      case 'bank_transfer':
        return <Building2 className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getMethodLabel = (method: string | null) => {
    switch (method) {
      case 'stripe':
        return 'Credit/Debit Card';
      case 'beam_wallet':
        return 'Beam Wallet';
      case 'bank_transfer':
        return 'Bank Transfer';
      default:
        return method || 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-beam-teal-50/20">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <BeamLogo size="sm" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Payment Verification
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
              <ShieldCheck className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Verify Your Payment
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Enter your order reference or email to check the status of your payment securely
          </p>
        </motion.div>

        {/* Search Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="pt-6">
              <Tabs
                value={searchType}
                onValueChange={(v) => setSearchType(v as 'reference' | 'email')}
              >
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="reference" className="text-xs">
                    Order / Payment Reference
                  </TabsTrigger>
                  <TabsTrigger value="email" className="text-xs">
                    Email Address
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="reference" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ref">Order ID or Payment Reference</Label>
                    <Input
                      id="ref"
                      value={referenceInput}
                      onChange={(e) => setReferenceInput(e.target.value)}
                      placeholder="e.g. ORD-1234..., BEAM-..., BT-..., or pi_..."
                      onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Enter the reference from your order confirmation email or receipt
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="email" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="verifyEmail">Email Address</Label>
                    <Input
                      id="verifyEmail"
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="john@example.com"
                      onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      The email you used during checkout
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {error && (
                <p className="text-sm text-destructive mt-2">{error}</p>
              )}

              <Button
                className="w-full mt-4 bg-beam-pink-500 hover:bg-beam-pink-600"
                size="lg"
                onClick={handleVerify}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Verify Payment
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {/* Not Found */}
          {notFound && (
            <motion.div
              key="notfound"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="flex items-start gap-3 p-5">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      No payment found
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      We couldn&apos;t find a payment matching those details. Please double-check
                      your order reference or email address. If you recently made a payment,
                      it may take a few minutes to appear.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Payment Results */}
          {payments && payments.length > 0 && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {payments.map((payment, i) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="overflow-hidden">
                    {/* Status Header */}
                    <div
                      className={`px-5 py-4 flex items-center gap-3 border-b ${
                        payment.status === 'COMPLETED'
                          ? 'bg-emerald-50/80'
                          : payment.status === 'PENDING'
                            ? 'bg-amber-50/80'
                            : 'bg-gray-50/80'
                      }`}
                    >
                      {getStatusIcon(payment.status)}
                      <div className="flex-1">
                        <p className="text-sm font-semibold">
                          {payment.statusLabel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.createdAt)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs font-medium ${getStatusColor(payment.status)}`}
                      >
                        {payment.status}
                      </Badge>
                    </div>

                    <CardContent className="p-5 space-y-4">
                      {/* Payment Details */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Amount
                          </p>
                          <p className="text-lg font-bold">
                            {formatCurrency(payment.amountCents)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Payment Method
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {getMethodIcon(payment.paymentMethod)}
                            <span className="text-sm font-medium">
                              {getMethodLabel(payment.paymentMethod)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Reference
                          </p>
                          <p className="text-sm font-mono">{payment.reference || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Email
                          </p>
                          <p className="text-sm">{payment.email}</p>
                        </div>
                      </div>

                      {payment.description && (
                        <p className="text-sm text-muted-foreground">
                          {payment.description}
                        </p>
                      )}

                      <Separator />

                      {/* Verification Checks */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          Security Verification
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {[
                            {
                              label: 'Payment Received',
                              passed: payment.checks.paymentReceived,
                            },
                            {
                              label: 'Amount Verified',
                              passed: payment.checks.amountVerified,
                            },
                            {
                              label: 'Timestamp Verified',
                              passed: payment.checks.timestampVerified,
                            },
                            {
                              label: 'Processor Confirmed',
                              passed: payment.checks.processorConfirmed,
                            },
                          ].map((check) => (
                            <div
                              key={check.label}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                                check.passed
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {check.passed ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Clock className="h-3.5 w-3.5 text-amber-500" />
                              )}
                              {check.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trust Badges */}
        <div className="flex items-center justify-center gap-6 pt-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            SSL Encrypted
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure Verification
          </div>
        </div>
      </div>
    </div>
  );
}
