import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { requireAuth } from '@/lib/auth/serverAuth';
import * as admin from 'firebase-admin';
import bcrypt from 'bcryptjs';

const COL = 'M_User';
const MODULE_NAME = 'Users';

const isStrongPassword = (password: string) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    return passwordRegex.test(password);
};

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user, error } = await requireAuth(req, MODULE_NAME, 'CanEdit');
    if (error) return error;

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

        const firebaseUpdateData: any = {};
        if (Email) firebaseUpdateData.email = Email;
        if (FirstName || LastName) firebaseUpdateData.displayName = `${FirstName || ''} ${LastName || ''}`.trim();
        if (IsActive !== undefined) firebaseUpdateData.disabled = !IsActive;

        if (Password && Password.trim() !== '') {
            if (!isStrongPassword(Password)) {
                return NextResponse.json({ success: false, error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' }, { status: 400 });
            }
            const salt = await bcrypt.genSalt(10);
            updateData.Password = await bcrypt.hash(Password, salt);
            firebaseUpdateData.password = Password;
        } else {
            // Ensure we don't accidentally overwrite password with empty
            delete updateData.Password;
        }

        // remove undefined values
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        // 1. Update Firebase Auth (if there's anything to update)
        if (Object.keys(firebaseUpdateData).length > 0) {
            try {
                await adminAuth.updateUser(resolvedParams.id, firebaseUpdateData);
            } catch (authError: any) {
                // If it's a "user not found" error, it means the user was manually created in Firestore
                // before Firebase Auth integration. We might want to handle this gracefully or ignore.
                console.error(`Failed to update Firebase Auth user: ${authError.message}`);
            }
        }

        // 2. Update Firestore
        await adminDb.collection(COL).doc(resolvedParams.id).update(updateData);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user, error } = await requireAuth(req, MODULE_NAME, 'CanDelete');
    if (error) return error;

    try {
        const resolvedParams = await params;

        // 1. Delete from Firebase Auth
        try {
            await adminAuth.deleteUser(resolvedParams.id);
        } catch (authError: any) {
            console.error(`Failed to delete Firebase Auth user: ${authError.message}`);
            // Proceed anyway to delete from Firestore
        }

        // 2. Delete from Firestore
        await adminDb.collection(COL).doc(resolvedParams.id).delete();
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
