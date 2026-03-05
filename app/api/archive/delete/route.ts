// ============================================================
//  VisayasMed — API: DELETE /api/archive/delete
//  Permanently hard-deletes a record from Firestore
//  Body: { collection: string, id: string }
//  This is the ONLY endpoint that performs hard deletion.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { requireAuth } from '@/lib/auth/serverAuth';

const MODULE_NAME = 'Archive';

const ALLOWED_COLLECTIONS: Record<string, string> = {
    guarantors: 'T_Guarantor',
    quotations: 'T_Quotation',
    departments: 'M_Department',
    services: 'M_Service',
    users: 'M_User',
    roles: 'M_Role',
};

export async function DELETE(req: NextRequest) {
    const { user, error } = await requireAuth(req, MODULE_NAME, 'CanDelete');
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

        // For users: permanently delete from Firebase Auth as well
        if (collectionKey === 'users') {
            try {
                await adminAuth.deleteUser(id);
            } catch (authErr: any) {
                console.error('Failed to permanently delete Firebase Auth user:', authErr.message);
                // Continue to delete from Firestore even if Auth deletion fails
            }
        }

        // Permanently delete from Firestore
        await adminDb.collection(firestoreCollection).doc(id).delete();

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
