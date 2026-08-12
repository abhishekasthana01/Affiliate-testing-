import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function verifyAdmin(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (user.role as string !== 'ADMIN')) return null;
  return user;
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const campaigns = await prisma.scheduledReport.findMany({
    where: { reportType: 'email_campaign' },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, campaigns });
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { name, templateId, recipients, segment = 'all_affiliates', frequency = 'WEEKLY', scheduledAt } = body;

    if (!name || !templateId) {
      return NextResponse.json({ error: 'Campaign name and template ID are required' }, { status: 400 });
    }

    const template = await prisma.emailTemplate.findUnique({ where: { id: templateId } });
    if (!template) {
      return NextResponse.json({ error: 'Email template not found' }, { status: 404 });
    }

    const campaign = await prisma.scheduledReport.create({
      data: {
        name,
        reportType: 'email_campaign',
        frequency,
        recipients: recipients || [],
        filters: {
          templateId,
          segment,
          subject: template.subject,
        },
        format: 'email',
        nextRunAt: scheduledAt ? new Date(scheduledAt) : calculateNextRun(frequency),
        createdBy: admin.id,
      },
    });

    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    console.error('Email campaign schedule error:', error);
    return NextResponse.json({ error: 'Failed to schedule email campaign' }, { status: 500 });
  }
}

function calculateNextRun(frequency: string): Date {
  const next = new Date();
  if (frequency === 'DAILY') next.setDate(next.getDate() + 1);
  else if (frequency === 'MONTHLY') next.setMonth(next.getMonth() + 1);
  else next.setDate(next.getDate() + 7);
  next.setHours(9, 0, 0, 0);
  return next;
}
