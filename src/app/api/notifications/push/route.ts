import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function verifyAdmin(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return (user.role as string === 'ADMIN') ? user : null;
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { userIds, title, body, url } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
    }

    const subscriptions = await (prisma as any).pushSubscription.findMany({
      where: {
        isActive: true,
        ...(Array.isArray(userIds) && userIds.length > 0 ? { userId: { in: userIds } } : {}),
      },
    });

    const providerUrl = process.env.PUSH_PROVIDER_URL;
    if (!providerUrl) {
      return NextResponse.json({
        success: true,
        queued: false,
        subscriptions: subscriptions.length,
        message: 'Push subscriptions found. Configure PUSH_PROVIDER_URL to deliver browser/mobile pushes.',
      });
    }

    const results = await Promise.allSettled(
      subscriptions.map((subscription: any) =>
        fetch(providerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: {
              endpoint: subscription.endpoint,
              keys: subscription.keys,
            },
            notification: { title, body, url },
          }),
        })
      )
    );

    return NextResponse.json({
      success: true,
      queued: true,
      sent: results.filter((r) => r.status === 'fulfilled').length,
      failed: results.filter((r) => r.status === 'rejected').length,
    });
  } catch (error) {
    console.error('Push send error:', error);
    return NextResponse.json({ error: 'Failed to send push notification' }, { status: 500 });
  }
}
