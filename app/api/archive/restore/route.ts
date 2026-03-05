// ============================================================
//  VisayasMed — API: POST /api/archive/restore
//  Restores a soft-deleted record by setting IsDeleted=false
//  Body: { collection: string, id: string }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { requireAuth } from '@/lib/auth/serverAuth';
import * as admin from 'firebase-admin';

const MODULE_NAME = 'Archive';

const ALLOWED_COLLECTIONS: Record<string, string> = {
    guarantors: 'T_Guarantor',
    quotations: 'T_Quotation',
    departments: 'M_Department',
    services: 'M_Service',
    users: 'M_User',
    roles: 'M_Role',
};

export async function POST(req: NextRequest) {
    const { user, error } = await requireAuth(req, MODULE_NAME, 'CanEdit');
    if (error) return error;

    try {
        const body = await req.json();
        const { collection: collectionKey, id } = body;

        if (!collectionKey || !id) {
            return NextResponse.json({ success: false, error: 'collection and id are required' }, { status: 400 });
        }

        const firestoreCollection = ALLOWED_COLLECTIONS[collectionKey];
        if (!firestoreCollection) {
            return NextResponse.json({ success: false, error: 'Invalid collection' }, { status: 400 });
        }

        const updatePayload: Record<string, any> = {
            IsDeleted: false,
            UpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            UpdatedBy: user?.UserID,
        };

        // For users: also re-activate them and re-enable Firebase Auth
        if (collectionKey === 'users') {
            updatePayload.IsActive = true;
            try {
                await adminAuth.updateUser(id, { disabled: false });
            } catch (authErr: any) {
                console.error('Failed to re-enable Firebase Auth user:', authErr.message);
            }
        }

        // For departments and services: also restore IsActive
        if (collectionKey === 'departments' || collectionKey === 'services') {
            updatePayload.IsActive = true;
        }

        await adminDb.collection(firestoreCollection).doc(id).update(updatePayload);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
