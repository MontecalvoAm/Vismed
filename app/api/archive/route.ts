// ============================================================
//  VisayasMed — API: GET /api/archive
//  Fetches all soft-deleted records for a given tab
//  ?tab=guarantors|quotations|departments|services|users|logs
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/serverAuth';

const MODULE_NAME = 'Archive';

export async function GET(req: NextRequest) {
    const { error } = await requireAuth(req, MODULE_NAME, 'CanView');
    if (error) return error;

    const tab = req.nextUrl.searchParams.get('tab') || 'guarantors';

    try {
        let records: any[] = [];

        switch (tab) {
            case 'guarantors': {
                const data = await prisma.t_Guarantor.findMany({
                    where: { IsDeleted: true }
                });
                records = data.map(d => ({ ...d, id: d.GuarantorID, CreatedAt: d.CreatedAt.toISOString(), UpdatedAt: d.UpdatedAt.toISOString() }));
                break;
            }
            case 'quotations': {
                const data = await prisma.t_Quotation.findMany({
                    where: { IsDeleted: true }
                });
                records = data.map(d => ({ ...d, id: d.QuotationID, CreatedAt: d.CreatedAt.toISOString(), UpdatedAt: d.UpdatedAt.toISOString() }));
                break;
            }
            case 'departments': {
                const data = await prisma.m_Department.findMany({
                    where: { IsDeleted: true }
                });
                records = data.map(d => ({ ...d, id: d.DepartmentID, CreatedAt: d.CreatedAt.toISOString(), UpdatedAt: d.UpdatedAt.toISOString() }));
                break;
            }
            case 'services': {
                const data = await prisma.m_Service.findMany({
                    where: { IsDeleted: true }
                });
                records = data.map(d => ({ ...d, id: d.ServiceID, CreatedAt: d.CreatedAt.toISOString(), UpdatedAt: d.UpdatedAt.toISOString() }));
                break;
            }
            case 'users': {
                const data = await prisma.m_User.findMany({
                    where: { IsDeleted: true }
                });
                records = data.map(({ Password, ...safe }) => ({
                    ...safe,
                    id: safe.UserID,
                    CreatedAt: safe.CreatedAt.toISOString(),
                    UpdatedAt: safe.UpdatedAt.toISOString()
                }));
                break;
            }
            case 'logs': {
                const data = await prisma.t_AuditLog.findMany({
                    orderBy: { CreatedAt: 'desc' },
                    take: 200
                });
                records = data.map(d => ({ ...d, id: d.LogID, CreatedAt: d.CreatedAt.toISOString() }));
                break;
            }
            default:
                return NextResponse.json({ success: false, error: 'Invalid tab' }, { status: 400 });
        }

        return NextResponse.json({ success: true, records });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
