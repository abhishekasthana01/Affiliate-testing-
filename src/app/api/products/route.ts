import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getProductImages } from '@/lib/product-images';

function enrichProduct(product: {
  slug: string;
  imageUrl: string | null;
  metadata: unknown;
  [key: string]: unknown;
}) {
  const metadata = product.metadata as { images?: string[] } | null;
  const images = getProductImages({
    slug: product.slug,
    images: metadata?.images,
    imageUrl: product.imageUrl,
  });

  return {
    ...product,
    images,
    imageUrl: images[0] ?? product.imageUrl,
  };
}

/**
 * GET /api/products — Public endpoint to list active products
 * Used by the checkout page (no auth required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (slug) {
      const product = await prisma.product.findUnique({
        where: { slug },
      });

      if (!product || !product.isActive) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, product: enrichProduct(product) });
    }

    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const { getCurrencySymbol } = await import('@/lib/currency');
    const currencySymbol = await getCurrencySymbol();

    return NextResponse.json({
      success: true,
      products: products.map(enrichProduct),
      currencySymbol,
    });
  } catch (error) {
    console.error('Public products error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
