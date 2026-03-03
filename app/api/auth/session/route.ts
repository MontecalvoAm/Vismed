// ============================================================
//  VisayasMed — API: POST /api/auth/session
//  Verifies Firebase ID token and sets Secure HttpOnly cookie
//  Supports "Remember Me" for extended session duration
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from '@/lib/rateLimit';

// Session durations
const SESSION_DURATION = {
    STANDARD: 8 * 60 * 60 * 1000,   // 8 hours (default)
    REMEMBER_ME: 14 * 24 * 60 * 60 * 1000, // 14 days (remember me)
};

export async function POST(req: NextRequest) {
    try {
        // Rate limiting - 5 login attempts per 15 minutes
        const clientIp = getClientIp(req);
        const rateLimitResult = checkRateLimit(`login:${clientIp}`, RATE_LIMITS.LOGIN);
        if (!rateLimitResult.success) {
            return rateLimitResponse(rateLimitResult);
        }

        const body = await req.json();
        const { idToken, rememberMe } = body;

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

        // Determine session duration based on "Remember Me"
        const sessionDuration = rememberMe === true
            ? SESSION_DURATION.REMEMBER_ME
            : SESSION_DURATION.STANDARD;

        const expiresAt = new Date(Date.now() + sessionDuration);

        // Set Secure HttpOnly session cookie
        const response = NextResponse.json({
            success: true,
            expiresAt: expiresAt.toISOString(),
            persistent: rememberMe === true
        });

        response.cookies.set('vm_token', idToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            expires: expiresAt,
        });

        return response;
    } catch (err) {
        // Log error but don't expose details
        console.error('[Auth Session] Error:', err);
        return NextResponse.json({ error: 'Server error.' }, { status: 500 });
    }
}
