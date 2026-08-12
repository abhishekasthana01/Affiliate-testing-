import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys) {
      return NextResponse.json({ error: 'Push endpoint and keys are required' }, { status: 400 });
    }

    const subscription = await (prisma as any).pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId,
        keys,
        userAgent: request.headers.get('user-agent'),
        isActive: true,
      },
      create: {
        userId,
        endpoint,
        keys,
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    console.error('Push subscription error:', error);
    return NextResponse.json({ error: 'Failed to save push subscription' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { endpoint } = await request.json();
  if (!endpoint) return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });

  await (prisma as any).pushSubscription.updateMany({
    where: { endpoint, userId },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
