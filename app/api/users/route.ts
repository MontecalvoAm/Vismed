import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';
import bcrypt from 'bcryptjs';

const COL = 'M_User';

export async function GET() {
    try {
        const snap = await adminDb.collection(COL).orderBy('CreatedAt', 'desc').get();
        const users = snap.docs.map((d) => {
            const data = d.data();
            // Never expose the hashed password
            const { Password, ...safeData } = data;
            return { UserID: d.id, ...safeData };
        });
        return NextResponse.json({ success: true, users });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { Email, FirstName, LastName, RoleID, IsActive, Password } = body;

        let hashedPassword = '';
        if (Password) {
            const salt = await bcrypt.genSalt(10);
            hashedPassword = await bcrypt.hash(Password, salt);
        }

        const newUserRef = adminDb.collection(COL).doc();
        await newUserRef.set({
            Email: Email || '',
            FirstName: FirstName || '',
            LastName: LastName || '',
            RoleID: RoleID || 'staff',
            IsActive: IsActive !== undefined ? IsActive : true,
            Password: hashedPassword,
            CreatedAt: admin.firestore.FieldValue.serverTimestamp(),
            UpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return NextResponse.json({ success: true, UserID: newUserRef.id });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
