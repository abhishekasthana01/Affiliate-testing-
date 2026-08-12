'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  CreditCard,
  Wallet,
  Building2,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Loader2,
  Package,
  ArrowLeft,
  Copy,
  Check,
  Bell,
  CalendarClock,
  Zap,
  UploadCloud,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BeamLogo } from '@/components/ui/BeamLogo';
import { ProductImageGallery } from '@/components/product-image-gallery';
import { getProductImages } from '@/lib/product-images';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  images?: string[];
  category: string | null;
}

type PaymentMethodType = 'stripe' | 'beam_wallet' | 'bank_transfer';
type CheckoutStep = 'details' | 'payment' | 'confirmation';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const productSlug = searchParams.get('product');

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<CheckoutStep>('details');
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('stripe');

  // Attribution
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [resellerId, setResellerId] = useState(searchParams.get('reseller') || '');
  const [attributionSource, setAttributionSource] = useState<'url' | 'cookie' | 'none'>('none');

  // Payment result
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [proofNotes, setProofNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofSubmitting, setProofSubmitting] = useState(false);
  const [proofMessage, setProofMessage] = useState('');

  // ─── Automatic Attribution ──────────────────────────────────
  // Priority: 1) ?ref= URL param  2) affiliate_attribution cookie  3) none
  useEffect(() => {
    const urlRef = searchParams.get('ref');

    const urlReseller = searchParams.get('reseller');

    if (urlReseller || urlRef) {
      if (urlReseller) setResellerId(urlReseller);
      setReferralCode(urlRef || '');
      setAttributionSource('url');
      return;
    }

    // Fallback: read the affiliate_attribution cookie set by /r/[code] handler
    try {
      const cookieValue = document.cookie
        .split('; ')
        .find((c) => c.startsWith('affiliate_attribution='));

      if (cookieValue) {
        const decoded = decodeURIComponent(cookieValue.split('=').slice(1).join('='));
        const attribution = JSON.parse(decoded);

        if (attribution.reseller_id || attribution.referral_code) {
          setResellerId(attribution.reseller_id || '');
          setReferralCode(attribution.referral_code || '');
          setAttributionSource('cookie');
        }
      }
    } catch (err) {
      // Cookie parse failure — ignore, proceed without attribution
      console.debug('Could not read attribution cookie:', err);
    }
  }, [searchParams]);

  useEffect(() => {
    if (productSlug) {
      fetchProduct();
    } else {
      setLoading(false);
    }
  }, [productSlug]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products?slug=${productSlug}`);
      const data = await res.json();
      if (data.success && data.product) {
        setProduct(data.product);
      }
    } catch (err) {
      console.error('Failed to fetch product:', err);
    } finally {
      setLoading(false);
    }
  };

  const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
  };

  const formatCurrency = (cents: number, currency = product?.currency || 'EUR') =>
    `${CURRENCY_SYMBOLS[currency] || currency}${(cents / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const handleProceedToPayment = () => {
    if (!customerName.trim() || !customerEmail.trim()) {
      setError('Please enter your name and email');
      return;
    }
    if (!customerEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setStep('payment');
  };

  const handlePayment = async () => {
    if (!product) return;
    setProcessing(true);
    setError('');

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          customerEmail,
          customerName,
          paymentMethod: selectedMethod,
          referralCode,
          resellerId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Payment failed');
      }

      setPaymentResult(data);
      setStep('confirmation');
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProofSubmit = async () => {
    if (!paymentResult) return;

    const reference = paymentResult.paymentReference || paymentResult.bankReference;
    if (!reference) return;

    setProofSubmitting(true);
    setProofMessage('');

    try {
      const form = new FormData();
      form.append('reference', reference);
      form.append('customerEmail', customerEmail);
      form.append('proofUrl', proofUrl);
      form.append('notes', proofNotes);
      if (proofFile) form.append('proofFile', proofFile);

      const res = await fetch('/api/checkout/proof', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Could not submit payment proof');

      setProofMessage(data.message || 'Proof submitted for review');
      setProofUrl('');
      setProofNotes('');
      setProofFile(null);
    } catch (err: any) {
      setProofMessage(err.message || 'Could not submit payment proof');
    } finally {
      setProofSubmitting(false);
    }
  };

  const paymentMethods = [
    {
      id: 'stripe' as const,
      name: 'Credit / Debit Card',
      description: 'Visa, Mastercard, Amex',
      icon: CreditCard,
      color: 'from-blue-500 to-indigo-600',
    },
    {
      id: 'beam_wallet' as const,
      name: 'Beam Wallet',
      description: 'Direct Beam Wallet payment',
      icon: Wallet,
      color: 'from-beam-pink-500 to-beam-purple-600',
    },
    {
      id: 'bank_transfer' as const,
      name: 'Bank Transfer',
      description: 'Instant bank-integrated order',
      icon: Building2,
      color: 'from-emerald-500 to-teal-600',
    },
  ];

  const automaticPaymentHighlights = [
    {
      label: 'Direct Beam Wallet settlement',
      icon: Wallet,
    },
    {
      label: 'Weekly or monthly payment orders',
      icon: CalendarClock,
    },
    {
      label: 'Instant bank-integrated payments',
      icon: Zap,
    },
    {
      label: 'Email and push confirmations',
      icon: Bell,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-beam-pink-500" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h2 className="text-lg font-semibold">Product not found</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Please check the URL or contact support
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const productImages = getProductImages(product);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-beam-teal-50/20">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <BeamLogo size="sm" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Secure Checkout
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['Details', 'Payment', 'Confirmation'].map((label, i) => {
            const stepIndex = ['details', 'payment', 'confirmation'].indexOf(step);
            const isActive = i === stepIndex;
            const isCompleted = i < stepIndex;
            return (
              <React.Fragment key={label}>
                {i > 0 && (
                  <div
                    className={`h-px w-8 ${
                      isCompleted ? 'bg-beam-pink-500' : 'bg-gray-200'
                    }`}
                  />
                )}
                <div className="flex items-center gap-1.5">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-beam-pink-500 text-white scale-110'
                        : isCompleted
                          ? 'bg-beam-pink-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:block ${
                      isActive ? 'text-beam-pink-600' : 'text-muted-foreground'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Order Summary — shown first on mobile */}
          <div className="order-1 lg:order-2 lg:col-span-2">
            <Card className="sticky top-20 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ProductImageGallery
                  images={productImages}
                  name={product.name}
                  variant="compact"
                />

                <div>
                  <p className="text-sm font-semibold">{product.name}</p>
                  {product.description && (
                    <p className="text-xs text-muted-foreground line-clamp-3 mt-1">
                      {product.description}
                    </p>
                  )}
                  {product.category && (
                    <Badge variant="secondary" className="text-[10px] mt-2">
                      {product.category}
                    </Badge>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(product.priceCents)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="text-muted-foreground">Included</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-lg font-bold text-beam-pink-600">
                    {formatCurrency(product.priceCents)}
                  </span>
                </div>

                {(resellerId || referralCode) && (
                  <div className="bg-beam-teal-50 rounded-lg p-3">
                    <p className="text-xs text-beam-teal-700">
                      <span className="font-semibold">Reseller:</span>{' '}
                      <code className="bg-beam-teal-100 px-1.5 py-0.5 rounded text-[10px]">
                        {resellerId || referralCode}
                      </code>
                    </p>
                    <p className="text-[10px] text-beam-teal-500 mt-1">
                      {attributionSource === 'url'
                        ? 'Tracked via referral link'
                        : 'Automatically attributed from your last visit'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="order-2 lg:order-1 lg:col-span-3">
            <AnimatePresence mode="wait">
              {/* Step 1: Customer Details */}
              {step === 'details' && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Your Details</CardTitle>
                      <CardDescription>
                        Enter your information to proceed
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="john@example.com"
                        />
                      </div>
                      {error && (
                        <p className="text-sm text-destructive">{error}</p>
                      )}
                      <Button
                        className="w-full bg-beam-pink-500 hover:bg-beam-pink-600"
                        size="lg"
                        onClick={handleProceedToPayment}
                      >
                        Continue to Payment
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Step 2: Payment Method */}
              {step === 'payment' && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setStep('details')}
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                          <CardTitle>Payment Method</CardTitle>
                          <CardDescription>
                            Choose how you&apos;d like to pay
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Payment method selector */}
                      <div className="space-y-3">
                        {paymentMethods.map((method) => (
                          <button
                            key={method.id}
                            onClick={() => setSelectedMethod(method.id)}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                              selectedMethod === method.id
                                ? 'border-beam-pink-500 bg-beam-pink-50/50 shadow-sm'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div
                              className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${method.color} text-white shadow-sm`}
                            >
                              <method.icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold">
                                {method.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {method.description}
                              </p>
                            </div>
                            <div
                              className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                                selectedMethod === method.id
                                  ? 'border-beam-pink-500'
                                  : 'border-gray-300'
                              }`}
                            >
                              {selectedMethod === method.id && (
                                <div className="h-2.5 w-2.5 rounded-full bg-beam-pink-500" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="grid gap-2 rounded-lg border border-beam-teal-100 bg-beam-teal-50/60 p-3 sm:grid-cols-2">
                        {automaticPaymentHighlights.map((item) => (
                          <div
                            key={item.label}
                            className="flex min-w-0 items-center gap-2 text-xs text-beam-teal-800"
                          >
                            <item.icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="leading-snug">{item.label}</span>
                          </div>
                        ))}
                      </div>

                      {error && (
                        <p className="text-sm text-destructive">{error}</p>
                      )}

                      <Button
                        className="w-full bg-beam-pink-500 hover:bg-beam-pink-600"
                        size="lg"
                        onClick={handlePayment}
                        disabled={processing}
                      >
                        {processing && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Pay {formatCurrency(product.priceCents)}
                      </Button>

                      {/* Security badges */}
                      <div className="flex items-center justify-center gap-4 pt-2">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          SSL Encrypted
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Lock className="h-3.5 w-3.5" />
                          PCI Compliant
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Step 3: Confirmation */}
              {step === 'confirmation' && paymentResult && (
                <motion.div
                  key="confirmation"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="overflow-hidden">
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                      >
                        <CheckCircle2 className="h-16 w-16 mx-auto mb-3" />
                      </motion.div>
                      <h2 className="text-xl font-bold">
                        {paymentResult.paymentMethod === 'stripe'
                          ? 'Payment Initiated!'
                          : paymentResult.paymentMethod === 'beam_wallet'
                            ? 'Payment Reference Created!'
                            : 'Transfer Details Ready!'}
                      </h2>
                      <p className="text-sm text-white/80 mt-1">
                        Order {paymentResult.orderId}
                      </p>
                    </div>
                    <CardContent className="p-6 space-y-4">
                      {/* Beam Wallet details */}
                      {paymentResult.paymentMethod === 'beam_wallet' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-beam-pink-50 rounded-lg">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Payment Reference
                              </p>
                              <p className="text-sm font-mono font-bold">
                                {paymentResult.paymentReference}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                copyToClipboard(
                                  paymentResult.paymentReference
                                )
                              }
                            >
                              {copied ? (
                                <Check className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {paymentResult.instructions}
                          </p>
                        </div>
                      )}

                      {/* Bank Transfer details */}
                      {paymentResult.paymentMethod === 'bank_transfer' &&
                        paymentResult.bankDetails && (
                          <div className="space-y-3">
                            {[
                              {
                                label: 'Account Name',
                                value: paymentResult.bankDetails.accountName,
                              },
                              {
                                label: 'IBAN',
                                value: paymentResult.bankDetails.iban,
                              },
                              {
                                label: 'BIC/SWIFT',
                                value: paymentResult.bankDetails.bic,
                              },
                              {
                                label: 'Reference',
                                value: paymentResult.bankDetails.reference,
                              },
                              {
                                label: 'Amount',
                                value: formatCurrency(paymentResult.amount),
                              },
                            ].map((item) => (
                              <div
                                key={item.label}
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                              >
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    {item.label}
                                  </p>
                                  <p className="text-sm font-medium font-mono">
                                    {item.value}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    copyToClipboard(item.value)
                                  }
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                            <p className="text-sm text-muted-foreground">
                              {paymentResult.instructions}
                            </p>
                          </div>
                        )}

                      {(paymentResult.paymentMethod === 'beam_wallet' ||
                        paymentResult.paymentMethod === 'bank_transfer') && (
                        <div className="space-y-3 rounded-lg border border-dashed p-3">
                          <div className="flex items-center gap-2">
                            <UploadCloud className="h-4 w-4 text-beam-pink-500" />
                            <p className="text-sm font-semibold">Submit payment proof</p>
                          </div>
                          <Input
                            value={proofUrl}
                            onChange={(e) => setProofUrl(e.target.value)}
                            placeholder="Receipt or bank confirmation link"
                          />
                          <Input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                          />
                          <Textarea
                            value={proofNotes}
                            onChange={(e) => setProofNotes(e.target.value)}
                            placeholder="Optional notes for the validation team"
                            className="min-h-20"
                          />
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleProofSubmit}
                            disabled={proofSubmitting}
                          >
                            {proofSubmitting && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Send for validation
                          </Button>
                          {proofMessage && (
                            <p className="text-xs text-muted-foreground">{proofMessage}</p>
                          )}
                        </div>
                      )}

                      {/* Stripe */}
                      {paymentResult.paymentMethod === 'stripe' && (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground">
                            Your card payment of{' '}
                            <strong>
                              {formatCurrency(paymentResult.amount)}
                            </strong>{' '}
                            is being processed. You&apos;ll receive a
                            confirmation email at{' '}
                            <strong>{customerEmail}</strong>.
                          </p>
                        </div>
                      )}

                      <Separator />

                      <p className="text-xs text-center text-muted-foreground">
                        A receipt will be sent to {customerEmail}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <Loader2 className="h-8 w-8 animate-spin text-beam-pink-500" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
