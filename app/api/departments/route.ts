import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/serverAuth';

const MODULE_NAME = 'Departments';

export async function GET(req: NextRequest) {
    const { error } = await requireAuth(req, MODULE_NAME, 'CanView');
    if (error) return error;

    try {
        const departments = await prisma.m_Department.findMany({
            where: { IsDeleted: false },
            orderBy: { SortOrder: 'asc' },
        });

        return NextResponse.json({ success: true, departments });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const { user, error } = await requireAuth(req, MODULE_NAME, 'CanAdd');
    if (error) return error;

    try {
        const body = await req.json();
        const { DepartmentID, DepartmentName, Description, SortOrder, IsActive } = body;

        const newDept = await prisma.m_Department.create({
            data: {
                DepartmentID: DepartmentID || undefined,
                DepartmentName,
                Description: Description || '',
                SortOrder: SortOrder ? Number(SortOrder) : 0,
                IsActive: IsActive !== undefined ? Boolean(IsActive) : true,
            },
        });

        return NextResponse.json({ success: true, id: newDept.DepartmentID });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
