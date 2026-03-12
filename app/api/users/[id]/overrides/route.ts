import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/serverAuth';
import { invalidatePermCache } from '@/lib/permCache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: userID } = await params;

        const user = await prisma.m_User.findUnique({
            where: { UserID: userID },
            include: {
                Role: {
                    include: {
                        Permissions: true
                    }
                },
                Overrides: true
            }
        });

        if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

        const rolePerms: Record<string, any> = {};
        user.Role?.Permissions.forEach(p => {
            rolePerms[p.ModuleName] = { ...p };
        });

        const overrides: Record<string, any> = {};
        user.Overrides.forEach(o => {
            overrides[o.ModuleName] = { ...o };
        });

        return NextResponse.json({ success: true, rolePerms, overrides });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth(req, 'Users', 'CanEdit');
    if (error) return error;

    try {
        const { id: userID } = await params;
        const body = await req.json();
        const { overrides } = body;

        await prisma.$transaction(async (tx) => {
            // 1. Delete existing overrides for this user
            await tx.mT_UserOverride.deleteMany({
                where: { UserID: userID }
            });

            // 2. Insert new overrides
            if (overrides && typeof overrides === 'object') {
                const dataToInsert = Object.entries(overrides).map(([moduleName, perms]: [string, any]) => ({
                    UserID: userID,
                    ModuleName: moduleName,
                    CanView: perms.CanView === true || String(perms.CanView).toLowerCase() === 'true',
                    CanAdd: perms.CanAdd === true || String(perms.CanAdd).toLowerCase() === 'true',
                    CanEdit: perms.CanEdit === true || String(perms.CanEdit).toLowerCase() === 'true',
                    CanDelete: perms.CanDelete === true || String(perms.CanDelete).toLowerCase() === 'true',
                }));

                if (dataToInsert.length > 0) {
                    await tx.mT_UserOverride.createMany({
                        data: dataToInsert
                    });
                }
            }
        });

        invalidatePermCache(userID);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
