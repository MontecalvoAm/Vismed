// ============================================================
//  VisayasMed — API: GET /api/archive
//  Fetches all soft-deleted records for a given tab
//  ?tab=guarantors|quotations|departments|services|users|logs
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { requireAuth } from '@/lib/auth/serverAuth';
import * as admin from 'firebase-admin';

const MODULE_NAME = 'Archive';

function parseTimestamp(val: any): string | null {
    if (!val) return null;
    if (val instanceof admin.firestore.Timestamp) return val.toDate().toISOString();
    if (typeof val === 'string') return val;
    return null;
}

function mapDoc(d: admin.firestore.QueryDocumentSnapshot): Record<string, any> {
    const data = d.data();
    return {
        id: d.id,
        ...data,
        CreatedAt: parseTimestamp(data.CreatedAt),
        UpdatedAt: parseTimestamp(data.UpdatedAt),
        DeletedAt: parseTimestamp(data.DeletedAt),
    };
}

export async function GET(req: NextRequest) {
    const { user, error } = await requireAuth(req, MODULE_NAME, 'CanView');
    if (error) return error;

    const tab = req.nextUrl.searchParams.get('tab') || 'guarantors';

    try {
        let records: Record<string, any>[] = [];

        switch (tab) {
            case 'guarantors': {
                const snap = await adminDb.collection('T_Guarantor')
                    .where('IsDeleted', '==', true).get();
                records = snap.docs.map(mapDoc);
                break;
            }
            case 'quotations': {
                const snap = await adminDb.collection('T_Quotation')
                    .where('IsDeleted', '==', true).get();
                records = snap.docs.map(mapDoc);
                break;
            }
            case 'departments': {
                const snap = await adminDb.collection('M_Department')
                    .where('IsDeleted', '==', true).get();
                records = snap.docs.map(mapDoc);
                break;
            }
            case 'services': {
                const snap = await adminDb.collection('M_Service')
                    .where('IsDeleted', '==', true).get();
                records = snap.docs.map(mapDoc);
                break;
            }
            case 'users': {
                const snap = await adminDb.collection('M_User')
                    .where('IsDeleted', '==', true).get();
                records = snap.docs.map((d) => {
                    const data = d.data();
                    const { Password, ...safe } = data;
                    return {
                        id: d.id,
                        ...safe,
                        CreatedAt: parseTimestamp(data.CreatedAt),
                        UpdatedAt: parseTimestamp(data.UpdatedAt),
                    };
                });
                break;
            }
            case 'logs': {
                const snap = await adminDb.collection('MT_AuditLog')
                    .orderBy('CreatedAt', 'desc').limit(200).get();
                records = snap.docs.map(mapDoc);
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
