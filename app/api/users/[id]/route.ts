import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/serverAuth';
import { invalidatePermCache } from '@/lib/permCache';
import bcrypt from 'bcryptjs';

const MODULE_NAME = 'Users';

const isStrongPassword = (password: string) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    return passwordRegex.test(password);
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth(req, MODULE_NAME, 'CanView');
    if (error) return error;

    try {
        const resolvedParams = await params;
        const user = await prisma.m_User.findUnique({
            where: { UserID: resolvedParams.id },
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

        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, user });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth(req, MODULE_NAME, 'CanEdit');
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
            IsActive: IsActive !== undefined ? Boolean(IsActive) : undefined,
        };

        if (Password && Password.trim() !== '') {
            if (!isStrongPassword(Password)) {
                return NextResponse.json({ success: false, error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' }, { status: 400 });
            }
            const salt = await bcrypt.genSalt(10);
            updateData.Password = await bcrypt.hash(Password, salt);
        }

        // remove undefined values
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        await prisma.m_User.update({
            where: { UserID: resolvedParams.id },
            data: updateData
        });

        invalidatePermCache(resolvedParams.id);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth(req, MODULE_NAME, 'CanDelete');
    if (error) return error;

    try {
        const resolvedParams = await params;

        await prisma.m_User.update({
            where: { UserID: resolvedParams.id },
            data: {
                IsDeleted: true,
                IsActive: false,
            },
        });

        invalidatePermCache(resolvedParams.id);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

