// ============================================================
//  VisayasMed — API: DELETE /api/archive/delete
//  Permanently hard-deletes a record from MySQL
//  Body: { collection: string, id: string }
//  This is the ONLY endpoint that performs hard deletion.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/serverAuth';

const MODULE_NAME = 'Archive';

export async function DELETE(req: NextRequest) {
    const { error } = await requireAuth(req, MODULE_NAME, 'CanDelete');
    if (error) return error;

    try {
        const body = await req.json();
        const { collection: collectionKey, id } = body;

        if (!collectionKey || !id) {
            return NextResponse.json({ success: false, error: 'collection and id are required' }, { status: 400 });
        }

        switch (collectionKey) {
            case 'guarantors':
                await prisma.t_Guarantor.delete({
                    where: { GuarantorID: id }
                });
                break;
            case 'quotations':
                await prisma.t_Quotation.delete({
                    where: { QuotationID: id }
                });
                break;
            case 'departments':
                await prisma.m_Department.delete({
                    where: { DepartmentID: id }
                });
                break;
            case 'services':
                await prisma.m_Service.delete({
                    where: { ServiceID: id }
                });
                break;
            case 'users':
                await prisma.m_User.delete({
                    where: { UserID: id }
                });
                break;
            case 'roles':
                await prisma.m_Role.delete({
                    where: { RoleID: id }
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
