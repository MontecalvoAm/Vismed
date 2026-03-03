import { NextResponse, NextRequest } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from '@/lib/rateLimit';
import { sanitizeString, isValidEmail, validatePassword, validateRequired, sanitizeObject } from '@/lib/validation';
import { errorResponse, successResponse, AppError, ValidationError } from '@/lib/errors';

const COL = 'M_User';

const isStrongPassword = (password: string) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    return passwordRegex.test(password);
};

export async function GET(req: NextRequest) {
    try {
        // Rate limiting for API
        const clientIp = getClientIp(req);
        const rateLimitResult = checkRateLimit(`api:${clientIp}`, RATE_LIMITS.API);
        if (!rateLimitResult.success) {
            return rateLimitResponse(rateLimitResult);
        }

        const snap = await adminDb.collection(COL).orderBy('CreatedAt', 'desc').get();
        const users = snap.docs.map((d) => {
            const data = d.data();
            // Never expose the hashed password
            const { Password, ...safeData } = data;
            return { UserID: d.id, ...safeData };
        });
        return successResponse({ success: true, users });
    } catch (e: unknown) {
        return errorResponse(e, 'Failed to fetch users');
    }
}

export async function POST(req: NextRequest) {
    try {
        // Rate limiting
        const clientIp = getClientIp(req);
        const rateLimitResult = checkRateLimit(`api:${clientIp}`, RATE_LIMITS.API);
        if (!rateLimitResult.success) {
            return rateLimitResponse(rateLimitResult);
        }

        const body = await req.json();

        // Sanitize string inputs
        const sanitizedBody = sanitizeObject(body);
        const { Email, FirstName, LastName, RoleID, IsActive, Password } = sanitizedBody;

        // Validate required fields
        const requiredCheck = validateRequired(
            { Email, FirstName, LastName, Password },
            ['Email', 'FirstName', 'LastName', 'Password']
        );

        if (!requiredCheck.isValid) {
            throw new ValidationError(
                `Missing required fields: ${requiredCheck.missing.join(', ')}`
            );
        }

        // Validate email format
        if (!isValidEmail(Email as string)) {
            throw new ValidationError('Invalid email format');
        }

        // Validate password strength
        if (!isStrongPassword(Password as string)) {
            throw new ValidationError(
                'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
            );
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(Password as string, salt);

        let firebaseUser;
        try {
            firebaseUser = await adminAuth.createUser({
                email: Email as string,
                password: Password as string,
                displayName: `${FirstName} ${LastName}`,
                disabled: !(IsActive !== undefined ? Boolean(IsActive) : true)
            });
        } catch (authError: unknown) {
            const errorMessage = authError instanceof Error ? authError.message : 'Failed to create user in Firebase Auth';
            throw new AppError(errorMessage, 400, 'AUTH_ERROR');
        }

        try {
            const newUserRef = adminDb.collection(COL).doc(firebaseUser.uid);
            await newUserRef.set({
                Email: sanitizeString(Email as string),
                FirstName: sanitizeString(FirstName as string),
                LastName: sanitizeString(LastName as string),
                RoleID: RoleID || 'staff',
                IsActive: IsActive !== undefined ? Boolean(IsActive) : true,
                Password: hashedPassword,
                CreatedAt: admin.firestore.FieldValue.serverTimestamp(),
                UpdatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return successResponse({ success: true, UserID: newUserRef.id }, 201);
        } catch (dbError: unknown) {
            // Rollback Firebase Auth user if Firestore fails
            await adminAuth.deleteUser(firebaseUser.uid);
            throw new AppError('Failed to save user in database', 500, 'DB_ERROR');
        }
    } catch (e: unknown) {
        if (e instanceof AppError) {
            return errorResponse(e);
        }
        return errorResponse(e, 'Failed to create user');
    }
}
