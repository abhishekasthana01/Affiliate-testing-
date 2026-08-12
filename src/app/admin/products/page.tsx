'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Package, Link2 } from 'lucide-react';
import { ProductCard, type AffiliateProduct } from '@/components/affiliate/product-card';
import {
  ProductFormDialog,
} from '@/components/admin/product-form-dialog';
import { Card, CardContent } from '@/components/ui/card';

type SortOption = 'price-asc' | 'price-desc' | 'name-asc';

interface AdminProduct extends AffiliateProduct {
  url: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('price-asc');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/products');
      const data = await res.json();
      if (data.success) setProducts(data.products);
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

  if (loading) {
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground">
            Manage products — click a product to view details and edit
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      <Card className="bg-gradient-to-r from-beam-purple-50 to-beam-teal-50 border-beam-purple-100">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-beam-purple-500/10">
            <Link2 className="h-5 w-5 text-beam-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium">
              Each product auto-generates a unique tracking link for every affiliate partner
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {products.filter((p) => p.isActive).length} of {products.length} products active
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} displayed
        </p>
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm text-muted-foreground">Order by</span>
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

      {filteredProducts.length > 0 ? (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              href={`/admin/products/${product.slug}`}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-white py-20 text-center">
          <Package className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">
            {products.length === 0 ? 'No products yet' : 'No products found'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.length === 0
              ? 'Add your first product to start generating affiliate tracking links'
              : 'Try a different category filter'}
          </p>
          {products.length === 0 && (
            <Button size="sm" className="mt-4" onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Product
            </Button>
          )}
        </div>
      )}

      <ProductFormDialog
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSaved={fetchProducts}
      />
    </div>
  );
}
