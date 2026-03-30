// ============================================================
//  VisayasMed — API: POST /api/auth/session
//  Verifies MySQL credentials and sets Secure HttpOnly cookie
//  Supports "Remember Me" for extended session duration
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Session durations
const SESSION_DURATION = {
    STANDARD: 8 * 60 * 60 * 1000,   // 8 hours (default)
    REMEMBER_ME: 14 * 24 * 60 * 60 * 1000, // 14 days (remember me)
};

export async function POST(req: NextRequest) {
    try {
        const clientIp = getClientIp(req);
        const rateLimitResult = checkRateLimit(`login:${clientIp}`, RATE_LIMITS.LOGIN);
        if (!rateLimitResult.success) {
            return rateLimitResponse(rateLimitResult);
        }

        const body = await req.json();
        const { email, password, rememberMe, isLogin } = body;

        // Validation for initial login
        if (isLogin) {
            if (!email || !password) {
                return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
            }

            // Find user in MySQL
            const user = await prisma.m_User.findUnique({
                where: { Email: email },
                include: { Role: true }
            });

            if (!user || !user.IsActive) {
                // Generic error for security
                return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.Password);
            if (!isPasswordValid) {
                return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
            }

            // SINGLE SESSION LOGIC
            const sessionId = crypto.randomUUID();
            await prisma.m_User.update({
                where: { UserID: user.UserID },
                data: { CurrentSessionID: sessionId }
            });

            // Audit Log
            await prisma.t_AuditLog.create({
                data: {
                    LogID: crypto.randomUUID(),
                    UserID: user.UserID,
                    Action: 'LOGIN',
                    Target: 'AUTH',
                    Details: `User logged in from ${clientIp}`,
                    IPAddress: clientIp
                }
            });

            const sessionDuration = rememberMe === true
                ? SESSION_DURATION.REMEMBER_ME
                : SESSION_DURATION.STANDARD;

            const expiresAt = new Date(Date.now() + sessionDuration);
            const response = NextResponse.json({
                success: true,
                expiresAt: expiresAt.toISOString(),
                persistent: rememberMe === true
            });

            const cookieOptions: any = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
            };

            if (rememberMe) {
                cookieOptions.expires = expiresAt;
            }

            // Using UserID as token for now (can be swapped for JWT)
            response.cookies.set('vm_token', user.UserID, cookieOptions);
            response.cookies.set('vm_session_id', sessionId, cookieOptions);

            return response;
        } 
        
        // This part handles session renewal/check
        const userId = req.cookies.get('vm_token')?.value;
        const sessionId = req.cookies.get('vm_session_id')?.value;

        if (!userId || !sessionId) {
            return NextResponse.json({ error: 'Session invalidated.' }, { status: 401 });
        }

        const user = await prisma.m_User.findUnique({
            where: { UserID: userId }
        });

        if (!user || user.CurrentSessionID !== sessionId || !user.IsActive) {
            return NextResponse.json({ error: 'Session invalidated.' }, { status: 401 });
        }

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error('[Auth Session] Error:', err);
        return NextResponse.json({ error: 'Server error.' }, { status: 500 });
    }
}
