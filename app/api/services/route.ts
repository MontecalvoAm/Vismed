import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createAuditLog } from '@/lib/firestore/audit';
import { getClientIp } from '@/lib/rateLimit';

const MODULE_NAME = 'Services';

export async function GET(req: NextRequest) {
    const { error } = await requireAuth(req, MODULE_NAME, 'CanView');
    if (error) return error;

    try {
        const services = await prisma.m_Service.findMany({
            where: { IsDeleted: false },
            orderBy: { ServiceName: 'asc' },
        });

        return NextResponse.json({ success: true, services });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const { user: authUser, error } = await requireAuth(req, MODULE_NAME, 'CanAdd');
    if (error) return error;

    try {
        const body = await req.json();
        const { ServiceID, DepartmentID, ServiceName, Price, Unit, Description, IsActive } = body;

        const newService = await prisma.m_Service.create({
            data: {
                ServiceID: ServiceID || undefined,
                DepartmentID,
                ServiceName,
                Price: Price ? Number(Price) : 0,
                Unit: Unit || '',
                Description: Description || '',
                IsActive: IsActive !== undefined ? Boolean(IsActive) : true,
                CreatedBy: authUser?.UserID,
                UpdatedBy: authUser?.UserID,
            },
        });

        await createAuditLog({
            Action: 'CREATE_SERVICE',
            Module: MODULE_NAME,
            Target: newService.ServiceID,
            Details: JSON.stringify({ ServiceName, DepartmentID, Price, Unit, Description, IsActive }),
            UserID: authUser?.UserID,
            IpAddress: getClientIp(req),
        });

        return NextResponse.json({ success: true, id: newService.ServiceID });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
