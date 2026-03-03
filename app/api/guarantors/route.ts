import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAuth } from '@/lib/auth/serverAuth';
import * as admin from 'firebase-admin';

const COL = 'T_Guarantor';
const MODULE_NAME = 'Guarantors';

export async function POST(req: NextRequest) {
    const { user, error } = await requireAuth(req, MODULE_NAME, 'CanAdd');
    if (error) return error;

    try {
        const body = await req.json();
        const { GuarantorName, DiscountPercentage, DiscountAmount, Description, SortOrder, IsActive, CreatedBy } = body;

        // Auto-generate a doc ID if none is provided
        const docRef = body.GuarantorID
            ? adminDb.collection(COL).doc(body.GuarantorID)
            : adminDb.collection(COL).doc();
        const docId = docRef.id;

        await docRef.set({
            GuarantorID: docId,
            GuarantorName: GuarantorName || '',
            Name: GuarantorName || '', // Frontend reads this field
            DiscountPercentage: Number(DiscountPercentage) || 0,
            DiscountAmount: Number(DiscountAmount) || 0,
            Description: Description || '',
            SortOrder: SortOrder || 0,
            IsActive: IsActive ?? true,
            CreatedAt: admin.firestore.FieldValue.serverTimestamp(),
            CreatedBy: CreatedBy || user?.UserID,
            UpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            UpdatedBy: CreatedBy || user?.UserID,
        });

        return NextResponse.json({ success: true, id: docId });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
