import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET!
);

export default async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    console.log(`DEBUG: Middleware - Path: ${pathname}`);
    const isAdminRoute = pathname.startsWith('/api/admin') || pathname.startsWith('/admin');
    const isAffiliateRoute = pathname.startsWith('/api/affiliate') || pathname.startsWith('/affiliate');

    if (!isAdminRoute && !isAffiliateRoute) {
        return NextResponse.next();
    }

    const token = request.cookies.get('auth-token')?.value;
    console.log(`DEBUG: Middleware - Token present: ${!!token}`);

    if (!token) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.log(`DEBUG: Middleware - Redirecting to /login from ${pathname}`);
        return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
        // 3. Verify JWT
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const userRole = payload.role as string;
        console.log('DEBUG: Middleware - JWT Verified. UserID:', payload.userId, 'Role:', userRole);

        // 4. Role-based access control
        if (isAdminRoute && userRole !== 'ADMIN') {
            if (pathname.startsWith('/api/')) {
                return NextResponse.json(
                    { error: 'Forbidden: Admin access required' },
                    { status: 403 }
                );
            }
            return NextResponse.redirect(new URL('/login', request.url));
        }

        if (isAffiliateRoute && userRole !== 'AFFILIATE' && userRole !== 'ADMIN') {
            if (pathname.startsWith('/api/')) {
                return NextResponse.json(
                    { error: 'Forbidden: Affiliate access required' },
                    { status: 403 }
                );
            }
            return NextResponse.redirect(new URL('/login', request.url));
        }

        // 5. Inject user info into headers for API usage
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', payload.userId as string);
        requestHeaders.set('x-user-role', userRole);

        const response = NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });

        // Also set on the response for client-side visibility if needed
        response.headers.set('x-user-id', payload.userId as string);
        response.headers.set('x-user-role', userRole);

        return response;
    } catch (error) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 401 }
            );
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: [
        '/admin/:path*',
        '/affiliate/:path*',
        '/api/admin/:path*',
        '/api/affiliate/:path*',
        '/api/auth/me',
    ],
};
