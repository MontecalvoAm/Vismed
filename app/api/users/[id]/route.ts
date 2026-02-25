import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';
import bcrypt from 'bcryptjs';

const COL = 'M_User';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const body = await req.json();
        const { Email, FirstName, LastName, RoleID, IsActive, Password } = body;

        const updateData: any = {
            Email,
            FirstName,
            LastName,
            RoleID,
            IsActive,
            UpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (Password && Password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            updateData.Password = await bcrypt.hash(Password, salt);
        } else {
            // Ensure we don't accidentally overwrite password with empty
            delete updateData.Password;
        }

        // remove undefined values
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        await adminDb.collection(COL).doc(resolvedParams.id).update(updateData);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        await adminDb.collection(COL).doc(resolvedParams.id).delete();
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
