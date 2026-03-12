import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/serverAuth';
import { clearAllPermCaches } from '@/lib/permCache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: roleID } = await params;

        const rolePermsQuery = await prisma.mT_RolePermission.findMany({
            where: { RoleID: roleID }
        });

        const rolePerms: Record<string, any> = {};
        rolePermsQuery.forEach(d => {
            rolePerms[d.ModuleName] = { ...d };
        });

        return NextResponse.json({ success: true, permissions: rolePerms });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth(req, 'Users', 'CanEdit');
    if (error) return error;
    try {
        const { id: roleID } = await params;
        const body = await req.json();
        const { permissions } = body;

        await prisma.$transaction(async (tx) => {
            // 1. Delete existing permissions for this role
            await tx.mT_RolePermission.deleteMany({
                where: { RoleID: roleID }
            });

            // 2. Insert new permissions
            if (permissions && typeof permissions === 'object') {
                const dataToInsert = Object.entries(permissions).map(([moduleName, perms]: [string, any]) => ({
                    RoleID: roleID,
                    ModuleName: moduleName,
                    CanView: perms.CanView === true || String(perms.CanView).toLowerCase() === 'true',
                    CanAdd: perms.CanAdd === true || String(perms.CanAdd).toLowerCase() === 'true',
                    CanEdit: perms.CanEdit === true || String(perms.CanEdit).toLowerCase() === 'true',
                    CanDelete: perms.CanDelete === true || String(perms.CanDelete).toLowerCase() === 'true',
                }));

                if (dataToInsert.length > 0) {
                    await tx.mT_RolePermission.createMany({
                        data: dataToInsert
                    });
                }
            }
        });

        clearAllPermCaches();

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
