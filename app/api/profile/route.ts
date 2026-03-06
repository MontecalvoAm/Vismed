import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAuth } from '@/lib/auth/serverAuth';
import * as admin from 'firebase-admin';
import bcrypt from 'bcryptjs';
import { invalidatePermCache } from '@/lib/permCache';

const COL = 'M_User';

const isStrongPassword = (password: string) => {
    // Requires at least one lower, one upper, one number, one special char, and length >= 8
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    return passwordRegex.test(password);
};

export async function PUT(req: NextRequest) {
    // Authenticate user, but don't require any specific module permission since everyone can update their own profile.
    const { user, error } = await requireAuth(req, 'Users', 'CanView');
    if (error) return error;

    try {
        const body = await req.json();
        const { FirstName, LastName, CurrentPassword, NewPassword } = body;

        let requiresCacheInvalidation = false;

        // 1. Profile Update (First/Last Name)
        if (FirstName || LastName) {
            const firebaseUpdateData: any = {};
            const firestoreUpdateData: any = {
                UpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            if (FirstName) firestoreUpdateData.FirstName = FirstName;
            if (LastName) firestoreUpdateData.LastName = LastName;

            // Combine for Firebase Auth displayName
            const newFirstName = FirstName || user.dbUser.FirstName;
            const newLastName = LastName || user.dbUser.LastName;
            firebaseUpdateData.displayName = `${newFirstName} ${newLastName}`.trim();

            // Update Firebase Auth
            await admin.auth().updateUser(user.UserID, firebaseUpdateData);

            // Update Firestore
            await adminDb.collection(COL).doc(user.UserID).update(firestoreUpdateData);

            requiresCacheInvalidation = true;
        }

        // 2. Password Update
        if (NewPassword && CurrentPassword) {
            // Validate password strength
            if (!isStrongPassword(NewPassword)) {
                return NextResponse.json({
                    success: false,
                    error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
                }, { status: 400 });
            }

            // Fetch the user's current record from Firestore to get the hashed password
            const userDoc = await adminDb.collection(COL).doc(user.UserID).get();
            if (!userDoc.exists) {
                return NextResponse.json({ success: false, error: 'User record not found.' }, { status: 404 });
            }

            const userData = userDoc.data();
            const storedHashedPassword = userData?.Password;

            if (!storedHashedPassword) {
                return NextResponse.json({ success: false, error: 'No password set for this user. Contact Admin.' }, { status: 400 });
            }

            // Verify the current password
            const isMatch = await bcrypt.compare(CurrentPassword, storedHashedPassword);
            if (!isMatch) {
                return NextResponse.json({ success: false, error: 'Incorrect current password.' }, { status: 400 });
            }

            // Hash the new password and update
            const salt = await bcrypt.genSalt(10);
            const hashedNewPassword = await bcrypt.hash(NewPassword, salt);

            // Update Firebase Auth
            await admin.auth().updateUser(user.UserID, { password: NewPassword });

            // Update Firestore
            await adminDb.collection(COL).doc(user.UserID).update({
                Password: hashedNewPassword,
                UpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } else if (NewPassword && !CurrentPassword) {
            return NextResponse.json({ success: false, error: 'Current password is required to set a new password.' }, { status: 400 });
        }

        if (requiresCacheInvalidation) {
            invalidatePermCache(user.UserID);
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("Profile API Error:", e);
        return NextResponse.json({ success: false, error: e.message || 'An unexpected error occurred.' }, { status: 500 });
    }
}
