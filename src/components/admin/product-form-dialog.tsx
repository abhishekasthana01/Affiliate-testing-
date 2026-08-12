'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ImagePlus, Loader2, X } from 'lucide-react';

export interface ProductFormValues {
  name: string;
  description: string;
  url: string;
  priceCents: string;
  currency: string;
  imageUrl: string;
  images: string[];
  category: string;
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProductId?: string | null;
  initialValues?: ProductFormValues;
  onSaved: () => void;
}

const emptyForm: ProductFormValues = {
  name: '',
  description: '',
  url: '',
  priceCents: '',
  currency: 'EUR',
  imageUrl: '',
  images: [],
  category: '',
};

export function ProductFormDialog({
  open,
  onOpenChange,
  editingProductId,
  initialValues,
  onSaved,
}: ProductFormDialogProps) {
  const [form, setForm] = useState<ProductFormValues>(initialValues ?? emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      const values = initialValues ?? emptyForm;
      setForm(values);
      setImageUrlInput('');
    }
  }, [open, initialValues]);

  const setImages = (images: string[]) => {
    setForm((prev) => ({
      ...prev,
      images,
      imageUrl: images[0] || '',
    }));
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;

    setUploading(true);
    const uploaded: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append('file', file);

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body,
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to upload image');
        }

        uploaded.push(data.url);
      }

      setImages([...form.images, ...uploaded]);
    } catch (error) {
      console.error('Upload failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddImageUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;
    if (form.images.includes(url)) {
      setImageUrlInput('');
      return;
    }
    setImages([...form.images, url]);
    setImageUrlInput('');
  };

  const handleRemoveImage = (index: number) => {
    setImages(form.images.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const method = editingProductId ? 'PUT' : 'POST';
      const { images, imageUrl, ...rest } = form;
      const body = editingProductId
        ? { id: editingProductId, ...rest, images, imageUrl: images[0] || imageUrl || '' }
        : { ...rest, images, imageUrl: images[0] || imageUrl || '' };

      const res = await fetch('/api/admin/products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        onOpenChange(false);
        onSaved();
      } else {
        alert(data.error || 'Failed to save product');
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingProductId ? 'Edit Product' : 'Add Product'}</DialogTitle>
          <DialogDescription>
            {editingProductId
              ? 'Update product details. Affiliate links will update automatically.'
              : 'Add a product or service. Tracking links are generated automatically for all affiliates.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="productName">Product Name *</Label>
              <Input
                id="productName"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Beam Wallet NFC"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productUrl">Product URL *</Label>
              <Input
                id="productUrl"
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://yoursite.com/product"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productDesc">Description</Label>
              <Input
                id="productDesc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief product description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productPrice">Price (cents)</Label>
                <Input
                  id="productPrice"
                  type="number"
                  value={form.priceCents}
                  onChange={(e) => setForm({ ...form, priceCents: e.target.value })}
                  placeholder="7500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productCategory">Category</Label>
                <Input
                  id="productCategory"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Beam Wallet For Business"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Product Photos</Label>

              {form.images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.images.map((src, index) => (
                    <div
                      key={`${src}-${index}`}
                      className="relative h-20 w-20 overflow-hidden rounded-lg ring-1 ring-black/10"
                    >
                      <Image
                        src={src}
                        alt={`Product photo ${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                        aria-label="Remove photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="mr-2 h-4 w-4" />
                  )}
                  {uploading ? 'Uploading...' : 'Upload Photos'}
                </Button>
              </div>

              <div className="flex gap-2">
                <Input
                  id="productImage"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddImageUrl();
                    }
                  }}
                  placeholder="/images/product.jpg or https://..."
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={handleAddImageUrl}
                  disabled={!imageUrlInput.trim()}
                >
                  Add URL
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload JPEG, PNG, WebP, or GIF (max 5MB). The first photo is used as the cover image.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingProductId ? 'Update' : 'Add Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function productToFormValues(product: {
  name: string;
  description: string | null;
  url: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  images?: string[];
  category: string | null;
}): ProductFormValues {
  const images =
    product.images && product.images.length > 0
      ? product.images
      : product.imageUrl
        ? [product.imageUrl]
        : [];

  return {
    name: product.name,
    description: product.description || '',
    url: product.url,
    priceCents: String(product.priceCents),
    currency: product.currency,
    imageUrl: images[0] || '',
    images,
    category: product.category || '',
  };
}
