import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'ok',
      service: 'beam-affiliate',
      database: 'ok',
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        service: 'beam-affiliate',
        database: 'error',
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
      },
      { status: 503 }
    );
  }
}
