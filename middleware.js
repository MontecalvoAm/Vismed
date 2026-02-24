import { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_VALUE } from '@/lib/auth';

// Protect any route under /quotation
export function middleware(request) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith('/quotation')) {
        const sessionCookie = request.cookies.get(SESSION_COOKIE);
        const isLoggedIn = sessionCookie?.value === SESSION_VALUE;

        if (!isLoggedIn) {
            const loginUrl = new URL('/login', request.url);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/quotation/:path*'],
};
