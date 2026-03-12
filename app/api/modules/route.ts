import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/getServerUser';

export async function GET(req: NextRequest) {
    // We don't strictly require a specific module permission to view modules 
    // because they are needed for the sidebar/navigation.
    // However, we still check for a valid session and single-user login enforcement.
    const user = await getServerUser();
    if (!user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const modules = await prisma.m_Module.findMany({
            where: { IsActive: true, IsDeleted: false },
            orderBy: { SortOrder: 'asc' },
        });

        return NextResponse.json({ success: true, modules });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
