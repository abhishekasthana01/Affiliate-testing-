import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/email';

async function verifyAdmin(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return null;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role as string !== 'ADMIN')) return null;
    return user;
  } catch (_e) {
    return null;
  }
}

// GET: List team members
export async function GET(request: NextRequest) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const members = await prisma.teamMember.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, members });
  } catch (error) {
    console.error('Admin team GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
  }
}

// POST: Invite team member
export async function POST(request: NextRequest) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { email, name, role, permissions } = body;

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
    }

    // Check if already invited
    const existing = await prisma.teamMember.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'This email has already been invited' }, { status: 400 });
    }

    const member = await prisma.teamMember.create({
      data: {
        email: email.toLowerCase(),
        name,
        role: role || 'VIEWER',
        permissions: permissions || [],
        invitedBy: user.id,
        status: 'PENDING',
      },
    });

    // Send invitation email
    try {
      // Resolve the correct base URL for the invite link.
      // Priority: NEXT_PUBLIC_APP_URL env var (most explicit — set this in Vercel
      // dashboard) → request.url origin → x-forwarded headers → localhost fallback.
      const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, ''); // strip trailing slash

      let baseUrl = envUrl || '';

      if (!baseUrl) {
        try {
          const parsed = new URL(request.url);
          // Only trust request.url if it's not localhost (i.e. real prod host)
          if (!parsed.hostname.includes('localhost') && !parsed.hostname.includes('127.0.0.1')) {
            baseUrl = parsed.origin;
          }
        } catch {}
      }

      if (!baseUrl) {
        const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
        const host  = request.headers.get('x-forwarded-host') || request.headers.get('host');
        if (proto && host && !host.includes('localhost')) {
          baseUrl = `${proto}://${host}`;
        }
      }

      if (!baseUrl) baseUrl = 'http://localhost:3000';

      const inviteUrl = `${baseUrl}/register?email=${encodeURIComponent(email)}&invite=true`;
      
      await emailService.sendTeamInvitationEmail({
        name,
        email,
        role: role || 'VIEWER',
        invitedBy: user.name || user.email,
        inviteUrl,
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
    }

    return NextResponse.json({ success: true, member });
  } catch (error) {
    console.error('Admin team POST error:', error);
    return NextResponse.json({ error: 'Failed to invite team member' }, { status: 500 });
  }
}

// PUT: Update team member
export async function PUT(request: NextRequest) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Team member ID required' }, { status: 400 });
    }

    // Only allow specific fields (prevent mass assignment)
    const allowedFields = ['name', 'email', 'role', 'permissions', 'isActive'];
    const updates: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in body && body[key] !== undefined) updates[key] = body[key];
    }

    const member = await prisma.teamMember.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ success: true, member });
  } catch (error) {
    console.error('Admin team PUT error:', error);
    return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 });
  }
}

// DELETE: Remove team member
export async function DELETE(request: NextRequest) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Team member ID required' }, { status: 400 });
    }

    await prisma.teamMember.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin team DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete team member' }, { status: 500 });
  }
}
