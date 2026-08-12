'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';
import { getProductImages } from '@/lib/product-images';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export interface AffiliateProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  images?: string[];
  category: string | null;
  isActive?: boolean;
}

interface ProductCardProps {
  product: AffiliateProduct;
  href?: string;
}

export function ProductCard({ product, href }: ProductCardProps) {
  const images = getProductImages(product);
  const primaryImage = images[0];
  const detailHref = href ?? `/affiliate/products/${product.slug}`;

  const formatPrice = (cents: number, currency = 'EUR') =>
    `${CURRENCY_SYMBOLS[currency] || currency}${(cents / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <Link
      href={detailHref}
      className="group flex flex-col text-center transition-transform hover:-translate-y-1"
    >
      <div className="relative mb-4 flex h-56 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition-shadow group-hover:shadow-md">
        {product.isActive === false && (
          <span className="absolute left-3 top-3 z-20 rounded-full bg-beam-charcoal-800/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Inactive
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-beam-pink-100/80 via-purple-100/60 to-beam-teal-100/80" />
        <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40 blur-2xl" />
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.name}
            className="relative z-10 max-h-44 max-w-[85%] object-contain transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Package className="relative z-10 h-16 w-16 text-beam-pink-300" />
        )}
      </div>

      <h3 className="text-sm font-bold leading-snug text-beam-charcoal-800 group-hover:text-beam-pink-600 transition-colors px-1">
        {product.name}
      </h3>

      {product.priceCents > 0 && (
        <p className="mt-2 text-base font-semibold text-beam-pink-500">
          {formatPrice(product.priceCents, product.currency)}
        </p>
      )}
    </Link>
  );
}
