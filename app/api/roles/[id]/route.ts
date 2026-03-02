// ============================================================
//  VisayasMed — API: PUT /api/roles/[id]  DELETE /api/roles/[id]
//  Admin SDK — server-side only
//  Next.js 15: params must be awaited (Promise<{ id: string }>)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAuth } from '@/lib/auth/serverAuth';
import * as admin from 'firebase-admin';

const COL = 'M_Role';
const MODULE_NAME = 'Users'; // Role management usually falls under the Users module access

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth(req, MODULE_NAME, 'CanEdit');
    if (error) return error;
    try {
        const { id } = await context.params;
        const { RoleName, Description, IsActive } = await req.json();

        if (!RoleName?.trim()) {
            return NextResponse.json({ success: false, error: 'RoleName is required.' }, { status: 400 });
        }

        await adminDb.collection(COL).doc(id).update({
            RoleName: RoleName.trim(),
            Description: Description?.trim() ?? '',
            IsActive: IsActive !== undefined ? IsActive : true,
            UpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth(req, MODULE_NAME, 'CanDelete');
    if (error) return error;
    try {
        const { id } = await context.params;
        await adminDb.collection(COL).doc(id).delete();
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
