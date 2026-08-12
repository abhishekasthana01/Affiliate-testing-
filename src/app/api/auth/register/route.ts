import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { emailService } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 registration attempts per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const rateLimit = await checkRateLimit(ip, 'auth/register', 3, 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many registration attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000).toString() } }
      );
    }

    const body = await request.json();
    const { email, name, beamNumber } = body;

    // Validate required fields
    if (!email || !name) {
      return NextResponse.json(
        { success: false, message: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if there's a pending invitation for this email
    const invitation = await prisma.teamMember.findUnique({
      where: { email: email.toLowerCase().trim(), status: 'PENDING' }
    });

    // SECURITY: Only allow registration as ADMIN if they have a pending invitation
    const userRole = invitation ? 'ADMIN' : 'AFFILIATE';

    // Generate a cryptographically secure random password
    const crypto = await import('crypto');
    const randomPassword = crypto.randomBytes(24).toString('base64url');

    const result = await auth.register({
      email: email.toLowerCase().trim(),
      password: randomPassword,
      name: name.trim(),
      role: userRole,
      beamNumber: beamNumber ? String(beamNumber).trim() : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    // If there was an invitation, link the user and update status
    if (invitation && result.user) {
      await prisma.teamMember.update({
        where: { id: invitation.id },
        data: {
          userId: result.user.id,
          status: 'ACTIVE',
          acceptedAt: new Date(),
        }
      });
    }

    // Send welcome email (non-blocking - don't fail registration if email fails)
    try {
      // Log registration success
      console.log('✅ User registered successfully:', result.user!.email);
    } catch (emailError) {
      console.error('Failed to handle post-registration tasks:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      user: {
        id: result.user?.id,
        email: result.user?.email,
        name: result.user?.name,
        role: result.user?.role,
        status: result.user?.status,
      },
    });
  } catch (error) {
    console.error('Register API error:', error);
    return NextResponse.json(
      { success: false, message: 'Registration failed' },
      { status: 500 }
    );
  }
}
