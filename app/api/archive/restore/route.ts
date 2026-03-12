// ============================================================
//  VisayasMed — API: POST /api/archive/restore
//  Restores a soft-deleted record by setting IsDeleted=false
//  Body: { collection: string, id: string }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/serverAuth';

const MODULE_NAME = 'Archive';

export async function POST(req: NextRequest) {
    const { error } = await requireAuth(req, MODULE_NAME, 'CanEdit');
    if (error) return error;

    try {
        const body = await req.json();
        const { collection: collectionKey, id } = body;

        if (!collectionKey || !id) {
            return NextResponse.json({ success: false, error: 'collection and id are required' }, { status: 400 });
        }

        switch (collectionKey) {
            case 'guarantors':
                await prisma.t_Guarantor.update({
                    where: { GuarantorID: id },
                    data: { IsDeleted: false, IsActive: true }
                });
                break;
            case 'quotations':
                await prisma.t_Quotation.update({
                    where: { QuotationID: id },
                    data: { IsDeleted: false }
                });
                break;
            case 'departments':
                await prisma.m_Department.update({
                    where: { DepartmentID: id },
                    data: { IsDeleted: false, IsActive: true }
                });
                break;
            case 'services':
                await prisma.m_Service.update({
                    where: { ServiceID: id },
                    data: { IsDeleted: false, IsActive: true }
                });
                break;
            case 'users':
                await prisma.m_User.update({
                    where: { UserID: id },
                    data: { IsDeleted: false, IsActive: true }
                });
                break;
            case 'roles':
                await prisma.m_Role.update({
                    where: { RoleID: id },
                    data: { IsDeleted: false, IsActive: true }
                });
                break;
            default:
                return NextResponse.json({ success: false, error: 'Invalid collection' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
