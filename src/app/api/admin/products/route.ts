import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

function buildMetadata(
  existing: unknown,
  images?: string[]
): Prisma.InputJsonValue {
  const metadata =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};

  if (images !== undefined) {
    const filtered = images.filter(Boolean);
    if (filtered.length > 0) {
      metadata.images = filtered;
    } else {
      delete metadata.images;
    }
  }

  return metadata as Prisma.InputJsonValue;
}

function resolveImages(imageUrl?: string | null, images?: string[]): string[] {
  if (Array.isArray(images) && images.length > 0) {
    return images.filter(Boolean);
  }
  return imageUrl ? [imageUrl] : [];
}

/**
 * GET /api/admin/products — List all products
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const products = await prisma.product.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const { getProductImages } = await import('@/lib/product-images');

    const enriched = products.map((product) => {
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
    });

    return NextResponse.json({ success: true, products: enriched });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

/**
 * POST /api/admin/products — Create a product
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, url, priceCents, currency, imageUrl, images, category } = body;

    if (!name || !url) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 });
    }

    const imageList = resolveImages(imageUrl, images);

    // Auto-generate slug from name
    let slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check uniqueness, append number if needed
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: description || null,
        url,
        priceCents: parseInt(priceCents) || 0,
        currency: currency || 'EUR',
        imageUrl: imageList[0] || null,
        category: category || null,
        metadata: buildMetadata({}, imageList),
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/products — Update a product
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description, url, priceCents, currency, imageUrl, images, category, isActive, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const imageList =
      images !== undefined || imageUrl !== undefined
        ? resolveImages(imageUrl ?? existing.imageUrl, images)
        : undefined;

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(url !== undefined && { url }),
        ...(priceCents !== undefined && { priceCents: parseInt(priceCents) || 0 }),
        ...(currency !== undefined && { currency }),
        ...(imageList !== undefined && { imageUrl: imageList[0] || null }),
        ...(category !== undefined && { category }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder) || 0 }),
        ...(imageList !== undefined && {
          metadata: buildMetadata(existing.metadata, imageList),
        }),
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/products — Delete a product
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
