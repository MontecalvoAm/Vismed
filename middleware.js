import { NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/quotation', '/users', '/records', '/admin'];

export function middleware(request) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get('vm_token')?.value;

    // If user is authenticated and tries to access /login, redirect to /quotation
    if (pathname === '/login' && token) {
        const redirectUrl = new URL('/quotation', request.url);
        return NextResponse.redirect(redirectUrl);
    }

    // Check if the path is protected
    const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    if (isProtected) {
        if (!token) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('from', pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    // Include /login in matcher so authenticated users get redirected
    matcher: ['/login', '/quotation/:path*', '/users/:path*', '/records/:path*', '/admin/:path*'],
};
