import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/serverAuth';

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
    const { error } = await requireAuth(req, MODULE_NAME, 'CanAdd');
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
            },
        });

        return NextResponse.json({ success: true, id: newService.ServiceID });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
