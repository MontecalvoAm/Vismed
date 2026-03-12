// ============================================================
//  VisayasMed — API: GET /api/auth/me
//  MySQL Optimized: Prisma queries for user & permissions
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { permCache, CACHE_TTL_MS } from '@/lib/permCache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const UserID = req.cookies.get('vm_token')?.value;
    const sessionId = req.cookies.get('vm_session_id')?.value;

    if (!UserID) {
        return NextResponse.json({ authenticated: false, error: 'Unauthorized' }, { status: 200 });
    }

    try {
        // 1. Return cached result if still fresh AND session IDs match
        const cached = permCache.get(UserID);
        // FORCE BYPASS CACHE FOR NOW
        // if (cached && Date.now() < cached.expiresAt && cached.sessionId === sessionId) {
        //     return NextResponse.json(cached.data);
        // }

        // 2. Fetch User with Role, RolePermissions, and Overrides in one go
        const user: any = await prisma.m_User.findUnique({
            where: { UserID },
            include: {
                Role: {
                    include: {
                        Permissions: true
                    }
                },
                Overrides: true
            } as any
        });

        if (!user) {
            return NextResponse.json({ authenticated: false, error: 'User not found' }, { status: 200 });
        }

        if (!user.IsActive) {
            return NextResponse.json({ error: 'Account is inactive.' }, { status: 403 });
        }

        // SINGLE-USER LOGIN CHECK: Verify Session ID
        if (user.CurrentSessionID && user.CurrentSessionID !== sessionId) {
            return NextResponse.json({
                authenticated: false,
                sessionInvalidated: true,
                error: 'Logged in from another device. Your session has ended.'
            }, { status: 200 });
        }

        // 3. Resolve Hybrid RBAC — base role permissions first
        let resolved: Record<string, any> = {};

        // SPECIAL ACCESS: Super Admin or specific email gets ALL permissions
        if (user.Role?.RoleName === 'Super Admin' || user.Email === 'aljon.montecalvo08@gmail.com') {
            const allModules = await prisma.m_Module.findMany({
                where: { IsActive: true }
            });
            allModules.forEach(m => {
                resolved[m.ModuleName] = {
                    CanView: true,
                    CanAdd: true,
                    CanEdit: true,
                    CanDelete: true,
                };
            });
        } else {
            if (user.Role?.Permissions) {
                user.Role.Permissions.forEach((perm: any) => {
                    resolved[perm.ModuleName] = {
                        CanView: perm.CanView,
                        CanAdd: perm.CanAdd,
                        CanEdit: perm.CanEdit,
                        CanDelete: perm.CanDelete,
                    };
                });
            }

            // 4. User-specific overrides take priority over role permissions
            if (user.Overrides) {
                user.Overrides.forEach((ov: any) => {
                    resolved[ov.ModuleName] = {
                        CanView: ov.CanView,
                        CanAdd: ov.CanAdd,
                        CanEdit: ov.CanEdit,
                        CanDelete: ov.CanDelete,
                    };
                });
            }
        }

        const responseData = {
            UserID,
            Email: user.Email,
            FirstName: user.FirstName,
            LastName: user.LastName,
            RoleID: user.RoleID,
            RoleName: user.Role?.RoleName || 'Unknown',
            Permissions: resolved,
        };

        // 5. Store in cache for 60 seconds
        permCache.set(UserID, { data: responseData, expiresAt: Date.now() + CACHE_TTL_MS, sessionId });

        return NextResponse.json(responseData);
    } catch (err: any) {
        console.error('[/api/auth/me] Unexpected error:', err?.message ?? err);
        return NextResponse.json({ error: 'Server error.' }, { status: 500 });
    }
}
