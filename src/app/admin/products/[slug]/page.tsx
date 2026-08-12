'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ProductImageGallery } from '@/components/product-image-gallery';
import { getProductImages } from '@/lib/product-images';
import {
  ProductFormDialog,
  productToFormValues,
} from '@/components/admin/product-form-dialog';
import {
  ArrowLeft,
  ExternalLink,
  Package,
  Pencil,
  Trash2,
  Link2,
} from 'lucide-react';

interface AdminProductDetail {
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
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export default function AdminProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [product, setProduct] = useState<AdminProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/products');
      const data = await res.json();
      if (data.success) {
        const found = (data.products as AdminProductDetail[]).find((p) => p.slug === slug);
        setProduct(found || null);
      }
    } catch (error) {
      console.error('Failed to fetch product:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents: number, currency = 'EUR') =>
    `${CURRENCY_SYMBOLS[currency] || currency}${(cents / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const handleToggleActive = async () => {
    if (!product) return;
    try {
      await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id, isActive: !product.isActive }),
      });
      fetchProduct();
    } catch (error) {
      console.error('Toggle failed:', error);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    if (!confirm('Delete this product? Affiliate links will stop working for this product.')) return;

    try {
      const res = await fetch(`/api/admin/products?id=${product.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        router.push('/admin/products');
      } else {
        alert(data.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl space-y-6">
        <Skeleton className="h-9 w-32" />
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
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
        <Button variant="outline" className="mt-4" onClick={() => router.push('/admin/products')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
      </div>
    );
  }

  const images = getProductImages(product);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.push('/admin/products')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowEditModal(true)}>
            <Pencil className="h-4 w-4" />
            Edit Product
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl bg-gradient-to-br from-beam-pink-50 via-purple-50 to-beam-teal-50 p-4 ring-1 ring-black/5">
          <ProductImageGallery images={images} name={product.name} variant="detail" />
        </div>

        <div className="space-y-5">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {product.category && (
                <Badge variant="secondary" className="text-xs">
                  {product.category}
                </Badge>
              )}
              <Badge variant={product.isActive ? 'default' : 'secondary'} className="text-xs">
                {product.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
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
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-beam-charcoal-700">
                {product.description}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.open(product.url, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              View Product Page
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-beam-pink-500" />
            <CardTitle className="text-base">Product Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor="active-toggle" className="text-sm font-medium">
                Product Status
              </Label>
              <p className="text-xs text-muted-foreground">
                Inactive products are hidden from affiliates
              </p>
            </div>
            <Switch
              id="active-toggle"
              checked={product.isActive}
              onCheckedChange={handleToggleActive}
            />
          </div>

          <div className="grid gap-3 rounded-lg bg-muted/40 p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Slug</p>
              <p className="font-mono text-xs">{product.slug}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sort Order</p>
              <p>{product.sortOrder}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Product URL</p>
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-xs text-beam-pink-600 hover:underline"
              >
                {product.url}
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <ProductFormDialog
        open={showEditModal}
        onOpenChange={setShowEditModal}
        editingProductId={product.id}
        initialValues={productToFormValues(product)}
        onSaved={fetchProduct}
      />
    </div>
  );
}
