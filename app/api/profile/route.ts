import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/serverAuth';
import bcrypt from 'bcryptjs';
import { invalidatePermCache } from '@/lib/permCache';

const isStrongPassword = (password: string) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    return passwordRegex.test(password);
};

export async function PUT(req: NextRequest) {
    // Authenticate user
    const { user, error } = await requireAuth(req, 'Users', 'CanView');
    if (error) return error;

    try {
        const body = await req.json();
        const { FirstName, LastName, CurrentPassword, NewPassword } = body;

        let requiresCacheInvalidation = false;
        const updateData: any = {};

        // 1. Profile Update (First/Last Name)
        if (FirstName) {
            updateData.FirstName = FirstName;
            requiresCacheInvalidation = true;
        }
        if (LastName) {
            updateData.LastName = LastName;
            requiresCacheInvalidation = true;
        }

        // 2. Password Update
        if (NewPassword && CurrentPassword) {
            if (!isStrongPassword(NewPassword)) {
                return NextResponse.json({
                    success: false,
                    error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
                }, { status: 400 });
            }

            // Fetch the user's current record to get the hashed password
            const dbUser = await prisma.m_User.findUnique({
                where: { UserID: user.UserID }
            });

            if (!dbUser) {
                return NextResponse.json({ success: false, error: 'User record not found.' }, { status: 404 });
            }

            const storedHashedPassword = dbUser.Password;
            const isMatch = await bcrypt.compare(CurrentPassword, storedHashedPassword);
            if (!isMatch) {
                return NextResponse.json({ success: false, error: 'Incorrect current password.' }, { status: 400 });
            }

            const salt = await bcrypt.genSalt(10);
            updateData.Password = await bcrypt.hash(NewPassword, salt);
        } else if (NewPassword && !CurrentPassword) {
            return NextResponse.json({ success: false, error: 'Current password is required to set a new password.' }, { status: 400 });
        }

        if (Object.keys(updateData).length > 0) {
            await prisma.m_User.update({
                where: { UserID: user.UserID },
                data: updateData
            });
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
