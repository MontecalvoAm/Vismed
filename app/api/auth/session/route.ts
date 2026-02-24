// ============================================================
//  VisayasMed — API: POST /api/auth/session
//  Verifies Firebase ID token and sets Secure HttpOnly cookie
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

// Use firebase-admin for server-side token verification
// Note: firebase-admin credential uses GOOGLE_APPLICATION_CREDENTIALS
// For local dev we verify token structure via Firebase REST if admin creds unavailable.
// For production, set up firebase-admin service account.

export async function POST(req: NextRequest) {
    try {
        const { idToken } = await req.json();

        if (!idToken || typeof idToken !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid token.' }, { status: 400 });
        }

        // Verify token with Firebase REST API (works without service account)
        const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`;
        const verifyRes = await fetch(verifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
        });

        if (!verifyRes.ok) {
            return NextResponse.json({ error: 'Invalid token.' }, { status: 401 });
        }

        const verifyData = await verifyRes.json();
        if (!verifyData.users || verifyData.users.length === 0) {
            return NextResponse.json({ error: 'User not found.' }, { status: 401 });
        }

        // Set Secure HttpOnly session cookie (8 hour expiry)
        const expires = new Date(Date.now() + 8 * 60 * 60 * 1000).toUTCString();
        const response = NextResponse.json({ success: true });
        response.cookies.set('vm_token', idToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            expires: new Date(Date.now() + 8 * 60 * 60 * 1000),
        });
        return response;
    } catch (err) {
        return NextResponse.json({ error: 'Server error.' }, { status: 500 });
    }
}
