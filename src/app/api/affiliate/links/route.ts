import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/affiliate/links — Get all active products with auto-generated tracking links
 * Each product gets a unique affiliate link using the affiliate's referral code
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { affiliate: true },
    });

    if (!user || user.role !== 'AFFILIATE') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!user.affiliate) {
      return NextResponse.json({ error: 'Affiliate profile not found' }, { status: 404 });
    }

    const referralCode = user.affiliate.referralCode;
    const resellerId = user.affiliate.resellerId;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Get all active products
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    // Auto-generate tracking links for each product
    const productLinks = products.map((product) => {
      const metadata = product.metadata as { images?: string[] } | null;
      const images =
        metadata?.images && metadata.images.length > 0
          ? metadata.images
          : product.imageUrl
            ? [product.imageUrl]
            : [];

      // The tracking link uses /r/[code] with ?dest= pointing to the product URL
      const trackingUrl = `${appUrl}/r/${encodeURIComponent(resellerId)}?dest=${encodeURIComponent(product.url)}`;

      // A simpler direct link with reseller query param (for sites that read attribution directly)
      const directUrl = `${product.url}${product.url.includes('?') ? '&' : '?'}reseller=${encodeURIComponent(resellerId)}`;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        url: product.url,
        priceCents: product.priceCents,
        currency: product.currency,
        imageUrl: product.imageUrl,
        images,
        category: product.category,
        // Auto-generated links
        trackingLink: trackingUrl,
        directLink: directUrl,
        referralCode,
        resellerId,
      };
    });

    // Get currency symbol
    const { getCurrencySymbol } = await import('@/lib/currency');
    const currencySymbol = await getCurrencySymbol();

    return NextResponse.json({
      success: true,
      links: productLinks,
      referralCode,
      resellerId,
      totalProducts: productLinks.length,
      currencySymbol,
    });
  } catch (error) {
    console.error('Affiliate links error:', error);
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
  }
}
