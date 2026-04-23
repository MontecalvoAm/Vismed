import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/serverAuth';
import { clearAllPermCaches } from '@/lib/permCache';
import { createAuditLog, diffDescription } from '@/lib/firestore/audit';
import { getClientIp } from '@/lib/rateLimit';

const MODULE_NAME = 'Users';

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { user: authUser, error } = await requireAuth(req, MODULE_NAME, 'CanEdit');
    if (error) return error;
    try {
        const { id } = await context.params;
        const body = await req.json();
        const { RoleName, Description, IsActive } = body;

        if (!RoleName?.trim()) {
            return NextResponse.json({ success: false, error: 'RoleName is required.' }, { status: 400 });
        }

        // Fetch old values
        const oldRole = await prisma.m_Role.findUnique({
            where: { RoleID: id }
        });

        // ── Duplicate check (exclude self) ──
        const existing = await prisma.m_Role.findFirst({
            where: {
                RoleName: RoleName.trim(),
                NOT: { RoleID: id }
            }
        });
        
        if (existing) {
            return NextResponse.json(
                { success: false, error: 'A role with this name already exists.' },
                { status: 409 }
            );
        }

        await prisma.m_Role.update({
            where: { RoleID: id },
            data: {
                RoleName: RoleName.trim(),
                Description: Description?.trim() ?? '',
                IsActive: IsActive !== undefined ? Boolean(IsActive) : true,
                UpdatedBy: authUser?.UserID,
            }
        });

        const labels = {
            RoleName: 'Name',
            Description: 'Description',
            IsActive: 'Active Status'
        };
        const diff = oldRole ? await diffDescription(oldRole, body, labels) : 'Role details updated';

        await createAuditLog({
            Action: 'UPDATE_ROLE',
            Module: 'Roles',
            Target: id,
            Description: `Updated Role ${RoleName || oldRole?.RoleName || id}: ${diff}`,
            Details: JSON.stringify({ RoleName, Description, IsActive }),
            OldValues: oldRole,
            NewValues: body,
            UserID: authUser?.UserID,
            IpAddress: getClientIp(req),
        });

        clearAllPermCaches();

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { user: authUser, error } = await requireAuth(req, MODULE_NAME, 'CanDelete');
    if (error) return error;
    try {
        const { id } = await context.params;
        
        const oldRole = await prisma.m_Role.findUnique({
            where: { RoleID: id }
        });

        // Soft delete by marking as deleted and inactive
        await prisma.m_Role.update({
            where: { RoleID: id },
            data: {
                IsDeleted: true,
                IsActive: false,
                UpdatedBy: authUser?.UserID,
            }
        });

        await createAuditLog({
            Action: 'DELETE_ROLE',
            Module: 'Roles',
            Target: id,
            Description: `Deleted Role: ${oldRole?.RoleName || id}`,
            Details: 'Role marked as deleted',
            UserID: authUser?.UserID,
            IpAddress: getClientIp(req),
        });

        clearAllPermCaches();
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
