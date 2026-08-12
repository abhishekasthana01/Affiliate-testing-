import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET!
);

export async function GET(request: NextRequest) {
  try {
    let userId = request.headers.get('x-user-id');
    
    // Fallback: Check cookie directly if header is missing (Turbopack/Middleware edge case)
    if (!userId) {
      const token = request.cookies.get('auth-token')?.value;
      if (token) {
        try {
          const { payload } = await jwtVerify(token, JWT_SECRET);
          userId = payload.userId as string;
        } catch (e) {
          console.error('DEBUG: Auth Me - JWT Fallback verify failed');
        }
      }
    }

    console.log('DEBUG: Auth Me - Final UserID:', userId);

    if (!userId) {
      console.log('DEBUG: Auth Me - No user ID found in headers');
      return NextResponse.json(
        { error: 'User ID missing in headers' },
        { status: 401 }
      );
    }

    // Get user from database to ensure they still exist and get latest data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        affiliate: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hasAffiliate: !!user.affiliate,
        affiliateId: user.affiliate?.id,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}
