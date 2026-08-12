'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ProductImageGallery } from '@/components/product-image-gallery';
import { getProductImages } from '@/lib/product-images';
import {
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  Share2,
  Link2,
  Package,
} from 'lucide-react';

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  url: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  images?: string[];
  category: string | null;
  trackingLink: string;
  directLink: string;
  referralCode: string;
  resellerId: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user, loading: authLoading } = useAuth();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) fetchProduct();
  }, [authLoading, user, slug]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/affiliate/links');
      const data = await res.json();
      if (data.success) {
        const found = (data.links as ProductDetail[]).find((p) => p.slug === slug);
        setProduct(found || null);
      }
    } catch (error) {
      console.error('Failed to fetch product:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatPrice = (cents: number, currency = 'EUR') =>
    `${CURRENCY_SYMBOLS[currency] || currency}${(cents / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  if (authLoading || loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <Skeleton className="h-9 w-32" />
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Package className="mb-4 h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold">Product not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/affiliate/products')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
      </div>
    );
  }

  const images = getProductImages(product);

  return (
    <div className="max-w-5xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
        onClick={() => router.push('/affiliate/products')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Products
      </Button>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Images */}
        <div className="rounded-2xl bg-gradient-to-br from-beam-pink-50 via-purple-50 to-beam-teal-50 p-4 ring-1 ring-black/5">
          <ProductImageGallery images={images} name={product.name} variant="detail" />
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div>
            {product.category && (
              <Badge variant="secondary" className="mb-2 text-xs">
                {product.category}
              </Badge>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-beam-charcoal-800">
              {product.name}
            </h1>
            {product.priceCents > 0 && (
              <p className="mt-2 text-2xl font-bold text-beam-pink-500">
                {formatPrice(product.priceCents, product.currency)}
              </p>
            )}
          </div>

          {product.description && (
            <div className="rounded-xl bg-white p-5 ring-1 ring-black/5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Description
              </h2>
              <p className="text-sm leading-relaxed text-beam-charcoal-700 whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="gap-2 bg-beam-pink-500 hover:bg-beam-pink-600"
              onClick={() => copyToClipboard(product.trackingLink, 'copy-link')}
            >
              {copiedId === 'copy-link' ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Link
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.open(product.url, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              View Product Page
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: product.name, url: product.trackingLink });
                } else {
                  copyToClipboard(product.trackingLink, 'share');
                }
              }}
            >
              <Share2 className="h-4 w-4" />
              Share Link
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Affiliate links */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-beam-pink-500" />
            <CardTitle className="text-base">Your Affiliate Links</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Copy and share these links to earn commissions on every sale
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
              Tracking Link
            </p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={product.trackingLink}
                className="font-mono text-xs h-9 bg-muted/50"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-9 shrink-0 gap-1.5 px-3"
                onClick={() => copyToClipboard(product.trackingLink, 'tracking')}
              >
                {copiedId === 'tracking' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
              Direct Link <span className="normal-case">(with reseller param)</span>
            </p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={product.directLink}
                className="font-mono text-xs h-9 bg-muted/50"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-9 shrink-0 gap-1.5 px-3"
                onClick={() => copyToClipboard(product.directLink, 'direct')}
              >
                {copiedId === 'direct' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-beam-teal-50 px-4 py-3 text-sm text-beam-teal-800">
            <span className="font-semibold">Your Reseller ID:</span>{' '}
            <code className="rounded bg-beam-teal-100 px-2 py-0.5 font-mono text-xs">
              {product.resellerId}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
