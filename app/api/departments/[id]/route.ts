import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createAuditLog, diffDescription } from '@/lib/firestore/audit';
import { getClientIp } from '@/lib/rateLimit';

const MODULE_NAME = 'Departments';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user, error } = await requireAuth(req, MODULE_NAME, 'CanEdit');
    if (error) return error;

    try {
        const resolvedParams = await params;
        const body = await req.json();
        const { DepartmentName, Icon, Description, SortOrder, IsActive } = body;

        // Fetch old values for auditing
        const oldDept = await prisma.m_Department.findUnique({
            where: { DepartmentID: resolvedParams.id }
        });

        await prisma.m_Department.update({
            where: { DepartmentID: resolvedParams.id },
            data: {
                DepartmentName: DepartmentName !== undefined ? DepartmentName : undefined,
                Icon: Icon !== undefined ? Icon : undefined,
                Description: Description !== undefined ? Description : undefined,
                SortOrder: SortOrder !== undefined ? Number(SortOrder) : undefined,
                IsActive: IsActive !== undefined ? Boolean(IsActive) : undefined,
                UpdatedBy: user?.UserID,
            },
        });

        const labels = {
            DepartmentName: 'Name',
            Description: 'Description',
            SortOrder: 'Sort Order',
            IsActive: 'Active Status'
        };

        const diff = oldDept ? await diffDescription(oldDept, body, labels) : 'Department details updated';

        await createAuditLog({
            Action: 'UPDATE_DEPARTMENT',
            Module: MODULE_NAME,
            Target: resolvedParams.id,
            Description: `Updated Department ${DepartmentName || oldDept?.DepartmentName || resolvedParams.id}: ${diff}`,
            Details: JSON.stringify({ DepartmentName, Icon, Description, SortOrder, IsActive }),
            OldValues: oldDept,
            NewValues: body,
            UserID: user?.UserID,
            IpAddress: getClientIp(req),
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user, error } = await requireAuth(req, MODULE_NAME, 'CanDelete');
    if (error) return error;

    try {
        const resolvedParams = await params;

        const oldDept = await prisma.m_Department.findUnique({
            where: { DepartmentID: resolvedParams.id }
        });

        // Soft delete
        await prisma.m_Department.update({
            where: { DepartmentID: resolvedParams.id },
            data: {
                IsDeleted: true,
                IsActive: false,
                UpdatedBy: user?.UserID,
            },
        });

        await createAuditLog({
            Action: 'DELETE_DEPARTMENT',
            Module: MODULE_NAME,
            Target: resolvedParams.id,
            Description: `Deleted Department: ${oldDept?.DepartmentName || resolvedParams.id}`,
            Details: 'Department marked as deleted',
            UserID: user?.UserID,
            IpAddress: getClientIp(req),
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
