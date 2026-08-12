import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveProductImage } from '@/lib/product-image-storage';

/**
 * POST /api/admin/upload — Upload a product image
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const url = await saveProductImage(file);

    return NextResponse.json({ success: true, url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload image';
    console.error('Upload error:', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
