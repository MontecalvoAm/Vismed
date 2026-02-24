import { NextResponse } from 'next/server';

// Protect any route under /quotation
export function middleware(request) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith('/quotation') || pathname.startsWith('/admin')) {
        const token = request.cookies.get('vm_token')?.value;

        if (!token) {
            const loginUrl = new URL('/login', request.url);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/quotation/:path*', '/admin/:path*'],
};
