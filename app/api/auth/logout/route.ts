// ============================================================
//  VisayasMed — API: POST /api/auth/logout
//  Clears the vm_token HttpOnly cookie
// ============================================================

import { NextResponse } from 'next/server';

export async function POST() {
    const response = NextResponse.json({ success: true });

    response.cookies.set('vm_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: new Date(0), // Expire immediately
    });

    response.cookies.set('vm_session_id', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: new Date(0), // Expire immediately
    });

    return response;
}
