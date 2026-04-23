import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createAuditLog } from '@/lib/firestore/audit';
import { getClientIp } from '@/lib/rateLimit';

const MODULE_NAME = 'Users';

export const dynamic = 'force-dynamic';

// ── GET: list all roles ──────────────────────────────────────
export async function GET() {
    try {
        const roles = await prisma.m_Role.findMany({
            orderBy: { RoleName: 'asc' }
        });
        return NextResponse.json({ success: true, roles });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

// ── POST: create a new role ──────────────────────────────────
export async function POST(req: NextRequest) {
    const { user: authUser, error } = await requireAuth(req, MODULE_NAME, 'CanAdd');
    if (error) return error;

    try {
        const { RoleName, Description, IsActive } = await req.json();

        if (!RoleName?.trim()) {
            return NextResponse.json({ success: false, error: 'RoleName is required.' }, { status: 400 });
        }

        // ── Duplicate check ──
        const existing = await prisma.m_Role.findUnique({
            where: { RoleName: RoleName.trim() }
        });
        
        if (existing) {
            return NextResponse.json(
                { success: false, error: 'A role with this name already exists.' },
                { status: 409 }
            );
        }

        const newRole = await prisma.m_Role.create({
            data: {
                RoleName: RoleName.trim(),
                Description: Description?.trim() || '',
                IsActive: IsActive !== undefined ? IsActive : true,
                CreatedBy: authUser?.UserID,
                UpdatedBy: authUser?.UserID,
            },
        });

        await createAuditLog({
            Action: 'CREATE_ROLE',
            Module: 'Roles',
            Target: newRole.RoleID,
            Description: `Created Role: ${RoleName}`,
            Details: JSON.stringify({ RoleName, Description, IsActive }),
            UserID: authUser?.UserID,
            IpAddress: getClientIp(req),
        });

        return NextResponse.json({ success: true, RoleID: newRole.RoleID });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
