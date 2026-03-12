import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from '@/lib/rateLimit';
import { sanitizeString, isValidEmail, validateRequired, sanitizeObject } from '@/lib/validation';
import { errorResponse, successResponse, AppError, ValidationError } from '@/lib/errors';

const isStrongPassword = (password: string) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    return passwordRegex.test(password);
};

export async function GET(req: NextRequest) {
    try {
        const clientIp = getClientIp(req);
        const rateLimitResult = checkRateLimit(`api:${clientIp}`, RATE_LIMITS.API);
        if (!rateLimitResult.success) {
            return rateLimitResponse(rateLimitResult);
        }

        const users = await prisma.m_User.findMany({
            where: { IsDeleted: false },
            orderBy: { CreatedAt: 'desc' },
            select: {
                UserID: true,
                Email: true,
                FirstName: true,
                LastName: true,
                RoleID: true,
                IsActive: true,
                CreatedAt: true,
                UpdatedAt: true,
            }
        });

        return successResponse({ success: true, users });
    } catch (e: unknown) {
        return errorResponse(e, 'Failed to fetch users');
    }
}

export async function POST(req: NextRequest) {
    try {
        const clientIp = getClientIp(req);
        const rateLimitResult = checkRateLimit(`api:${clientIp}`, RATE_LIMITS.API);
        if (!rateLimitResult.success) {
            return rateLimitResponse(rateLimitResult);
        }

        const body = await req.json();
        const sanitizedBody = sanitizeObject(body);
        const { Email, FirstName, LastName, RoleID, IsActive, Password } = sanitizedBody;

        const requiredCheck = validateRequired(
            { Email, FirstName, LastName, Password },
            ['Email', 'FirstName', 'LastName', 'Password']
        );

        if (!requiredCheck.isValid) {
            throw new ValidationError(
                `Missing required fields: ${requiredCheck.missing.join(', ')}`
            );
        }

        if (!isValidEmail(Email as string)) {
            throw new ValidationError('Invalid email format');
        }

        if (!isStrongPassword(Password as string)) {
            throw new ValidationError(
                'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
            );
        }

        // Check if user already exists
        const existingUser = await prisma.m_User.findUnique({
            where: { Email: Email as string }
        });

        if (existingUser) {
            throw new ValidationError('User with this email already exists');
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(Password as string, salt);

        const newUser = await prisma.m_User.create({
            data: {
                Email: sanitizeString(Email as string),
                FirstName: sanitizeString(FirstName as string),
                LastName: sanitizeString(LastName as string),
                RoleID: RoleID || undefined,
                IsActive: IsActive !== undefined ? Boolean(IsActive) : true,
                Password: hashedPassword,
            },
        });

        return successResponse({ success: true, UserID: newUser.UserID }, 201);
    } catch (e: unknown) {
        if (e instanceof AppError) {
            return errorResponse(e);
        }
        return errorResponse(e, 'Failed to create user');
    }
}
