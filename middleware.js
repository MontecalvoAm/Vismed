import { NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/quotation', '/users', '/records', '/admin'];

export function middleware(request) {
    const { pathname } = request.nextUrl;

    const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    if (isProtected) {
        const token = request.cookies.get('vm_token')?.value;

        if (!token) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('from', pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/quotation/:path*', '/users/:path*', '/records/:path*', '/admin/:path*'],
};
