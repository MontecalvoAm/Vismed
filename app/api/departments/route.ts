import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAuth } from '@/lib/auth/serverAuth';
import * as admin from 'firebase-admin';

const COL = 'M_Department';
const MODULE_NAME = 'Departments';

export async function POST(req: NextRequest) {
    const { user, error } = await requireAuth(req, MODULE_NAME, 'CanAdd');
    if (error) return error;

    try {
        const body = await req.json();
        const { DepartmentID, DepartmentName, Description, SortOrder, IsActive, CreatedBy } = body;

        await adminDb.collection(COL).doc(DepartmentID).set({
            DepartmentID,
            DepartmentName,
            Description: Description || '',
            SortOrder: SortOrder || 0,
            IsActive: IsActive ?? true,
            CreatedAt: admin.firestore.FieldValue.serverTimestamp(),
            CreatedBy: CreatedBy || user?.UserID,
            UpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            UpdatedBy: CreatedBy || user?.UserID,
        });

        return NextResponse.json({ success: true, id: DepartmentID });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
