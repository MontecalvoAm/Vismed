import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export type ActionType = 'CanView' | 'CanAdd' | 'CanEdit' | 'CanDelete';

export interface ValidatedUser {
    UserID: string;
    RoleID: string;
    dbUser?: any;
    Permissions: Record<string, {
        CanView: boolean;
        CanAdd: boolean;
        CanEdit: boolean;
        CanDelete: boolean;
    }>;
}

export async function requireAuth(req: NextRequest, moduleName: string, action: ActionType): Promise<{ user?: ValidatedUser; error?: NextResponse }> {
    const UserID = req.cookies.get('vm_token')?.value;
    const sessionId = req.cookies.get('vm_session_id')?.value;

    if (!UserID) {
        return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
    }

    try {
        // 1. Get M_User record with Role and Overrides
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
            return { error: NextResponse.json({ success: false, error: 'Account not found.' }, { status: 403 }) };
        }

        if (!user.IsActive) {
            return { error: NextResponse.json({ success: false, error: 'Account is inactive.' }, { status: 403 }) };
        }

        // SINGLE-USER LOGIN CHECK: Verify Session ID
        if (user.CurrentSessionID && user.CurrentSessionID !== sessionId) {
            return { error: NextResponse.json({ success: false, error: 'Session invalidated. Logged in from another device.', sessionInvalidated: true }, { status: 401 }) };
        }

        // 2. Resolve Hybrid RBAC
        const resolved: Record<string, any> = {};

        if (user.Role?.RoleName === 'Super Admin' || user.Email === 'aljon.montecalvo08@gmail.com') {
            const allModules = await prisma.m_Module.findMany({
                where: { IsActive: true }
            });
            allModules.forEach((m: any) => {
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

            // 3. User-specific overrides (take priority)
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

        const isSuperAdmin = user.Role?.RoleName === 'Super Admin' || user.Email === 'aljon.montecalvo08@gmail.com';
        const userPermissions = resolved[moduleName] || { CanView: false, CanAdd: false, CanEdit: false, CanDelete: false };

        if (!isSuperAdmin && !userPermissions[action]) {
            return { error: NextResponse.json({ success: false, error: `Forbidden: Missing ${action} permission for ${moduleName}` }, { status: 403 }) };
        }

        return {
            user: {
                UserID,
                RoleID: user.RoleID || '',
                dbUser: user,
                Permissions: resolved
            }
        };

    } catch (err: any) {
        console.error('Server Auth Error:', err?.message ?? err);
        return { error: NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 }) };
    }
}
