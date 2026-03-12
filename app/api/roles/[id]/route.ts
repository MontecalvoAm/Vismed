import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/serverAuth';
import { clearAllPermCaches } from '@/lib/permCache';

const MODULE_NAME = 'Users';

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth(req, MODULE_NAME, 'CanEdit');
    if (error) return error;
    try {
        const { id } = await context.params;
        const { RoleName, Description, IsActive } = await req.json();

        if (!RoleName?.trim()) {
            return NextResponse.json({ success: false, error: 'RoleName is required.' }, { status: 400 });
        }

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
            }
        });

        clearAllPermCaches();

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth(req, MODULE_NAME, 'CanDelete');
    if (error) return error;
    try {
        const { id } = await context.params;
        
        // Soft delete by marking as deleted and inactive
        await prisma.m_Role.update({
            where: { RoleID: id },
            data: {
                IsDeleted: true,
                IsActive: false,
            }
        });

        clearAllPermCaches();
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
