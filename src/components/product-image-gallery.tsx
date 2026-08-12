'use client';

import React, { useState } from 'react';
import { Package } from 'lucide-react';

interface ProductImageGalleryProps {
  images: string[];
  name: string;
  variant?: 'card' | 'compact' | 'detail';
}

export function ProductImageGallery({
  images,
  name,
  variant = 'card',
}: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    const emptyHeight =
      variant === 'detail' ? 'h-72' : variant === 'card' ? 'h-48' : 'h-36';
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-beam-purple-100 to-beam-teal-100 ${emptyHeight}`}
      >
        <Package className="h-8 w-8 text-beam-purple-600" />
      </div>
    );
  }

  const heroHeight =
    variant === 'detail' ? 'h-72' : variant === 'card' ? 'h-48' : 'h-36';
  const thumbSize =
    variant === 'detail' ? 'h-16 w-16' : variant === 'card' ? 'h-14 w-14' : 'h-12 w-12';

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div
        className={`flex w-full items-center justify-center bg-muted/30 p-3 ${heroHeight}`}
      >
        <img
          src={images[activeIndex]}
          alt={name}
          className="max-h-full max-w-full object-contain"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-t bg-muted/20 p-2">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                activeIndex === index
                  ? 'border-beam-purple-500'
                  : 'border-transparent hover:border-beam-purple-200'
              }`}
            >
              <img
                src={src}
                alt={`${name} ${index + 1}`}
                className={`${thumbSize} object-cover`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
