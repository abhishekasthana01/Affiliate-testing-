'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package } from 'lucide-react';
import { ProductCard, type AffiliateProduct } from '@/components/affiliate/product-card';

type SortOption = 'price-asc' | 'price-desc' | 'name-asc';

export default function AffiliateProductsPage() {
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('price-asc');

  useEffect(() => {
    if (!authLoading && user) fetchProducts();
  }, [authLoading, user]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/affiliate/links');
      const data = await res.json();
      if (data.success) setProducts(data.links || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(
      products.map((p) => p.category).filter((c): c is string => Boolean(c))
    );
    return Array.from(cats);
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (categoryFilter !== 'ALL') {
      result = result.filter((p) => p.category === categoryFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'price-asc') return a.priceCents - b.priceCents;
      if (sortBy === 'price-desc') return b.priceCents - a.priceCents;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [products, categoryFilter, sortBy]);

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Products</h2>
        <p className="text-muted-foreground">
          Browse products and click to view details and get your affiliate links
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} displayed
        </p>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Order by</span>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price-asc">Low to High</SelectItem>
              <SelectItem value="price-desc">High to Low</SelectItem>
              <SelectItem value="name-asc">Name A–Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter('ALL')}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
            categoryFilter === 'ALL'
              ? 'bg-beam-pink-500 text-white shadow-sm'
              : 'bg-white text-beam-charcoal-700 ring-1 ring-black/10 hover:bg-beam-pink-50'
          }`}
        >
          All Products
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setCategoryFilter(category)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              categoryFilter === category
                ? 'bg-beam-pink-500 text-white shadow-sm'
                : 'bg-white text-beam-charcoal-700 ring-1 ring-black/10 hover:bg-beam-pink-50'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-white py-20 text-center">
          <Package className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">No products found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different category filter
          </p>
        </div>
      )}
    </div>
  );
}
