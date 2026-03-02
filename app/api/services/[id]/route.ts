import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAuth } from '@/lib/auth/serverAuth';
import * as admin from 'firebase-admin';

const COL = 'M_Service';
const MODULE_NAME = 'Services';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user, error } = await requireAuth(req, MODULE_NAME, 'CanEdit');
    if (error) return error;

    try {
        const resolvedParams = await params;
        const body = await req.json();

        // Convert Price to number if it exists in body
        if ('Price' in body) {
            body.Price = Number(body.Price) || 0;
        }

        await adminDb.collection(COL).doc(resolvedParams.id).update({
            ...body,
            UpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            UpdatedBy: user?.UserID,
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user, error } = await requireAuth(req, MODULE_NAME, 'CanDelete');
    if (error) return error;

    try {
        const resolvedParams = await params;

        // Soft delete
        await adminDb.collection(COL).doc(resolvedParams.id).update({
            IsActive: false,
            UpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            UpdatedBy: user?.UserID,
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
