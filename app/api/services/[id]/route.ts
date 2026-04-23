import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createAuditLog, diffDescription } from '@/lib/firestore/audit';
import { getClientIp } from '@/lib/rateLimit';

const MODULE_NAME = 'Services';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user: authUser, error } = await requireAuth(req, MODULE_NAME, 'CanEdit');
    if (error) return error;

    try {
        const resolvedParams = await params;
        const body = await req.json();
        const { DepartmentID, ServiceName, Price, Unit, Description, IsActive } = body;

        // Fetch old values for auditing
        const oldService = await prisma.m_Service.findUnique({
            where: { ServiceID: resolvedParams.id }
        });

        await prisma.m_Service.update({
            where: { ServiceID: resolvedParams.id },
            data: {
                DepartmentID: DepartmentID !== undefined ? DepartmentID : undefined,
                ServiceName: ServiceName !== undefined ? ServiceName : undefined,
                Price: Price !== undefined ? Number(Price) : undefined,
                Unit: Unit !== undefined ? Unit : undefined,
                Description: Description !== undefined ? Description : undefined,
                IsActive: IsActive !== undefined ? Boolean(IsActive) : undefined,
                UpdatedBy: authUser?.UserID,
            },
        });

        const labels = {
            ServiceName: 'Name',
            DepartmentID: 'Department',
            Price: 'Price',
            Unit: 'Unit',
            Description: 'Description',
            IsActive: 'Active Status'
        };

        const diff = oldService ? await diffDescription(oldService, { 
            ...body, 
            Price: Price !== undefined ? Number(Price) : undefined 
        }, labels) : 'Service details updated';

        await createAuditLog({
            Action: 'UPDATE_SERVICE',
            Module: MODULE_NAME,
            Target: resolvedParams.id,
            Description: `Updated Service ${ServiceName || oldService?.ServiceName || resolvedParams.id}: ${diff}`,
            Details: JSON.stringify({ ServiceName, DepartmentID, Price, Unit, Description, IsActive }),
            OldValues: oldService,
            NewValues: body,
            UserID: authUser?.UserID,
            IpAddress: getClientIp(req),
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user: authUser, error } = await requireAuth(req, MODULE_NAME, 'CanDelete');
    if (error) return error;

    try {
        const resolvedParams = await params;

        const oldService = await prisma.m_Service.findUnique({
            where: { ServiceID: resolvedParams.id }
        });

        // Soft delete
        await prisma.m_Service.update({
            where: { ServiceID: resolvedParams.id },
            data: {
                IsDeleted: true,
                IsActive: false,
                UpdatedBy: authUser?.UserID,
            },
        });

        await createAuditLog({
            Action: 'DELETE_SERVICE',
            Module: MODULE_NAME,
            Target: resolvedParams.id,
            Description: `Deleted Service: ${oldService?.ServiceName || resolvedParams.id}`,
            Details: 'Service marked as deleted',
            UserID: authUser?.UserID,
            IpAddress: getClientIp(req),
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
