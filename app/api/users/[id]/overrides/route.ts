import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAuth } from '@/lib/auth/serverAuth';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: userID } = await params;

        // 1. Get user to find RoleID
        const userDoc = await adminDb.collection('M_User').doc(userID).get();
        if (!userDoc.exists) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

        const roleID = userDoc.data()?.RoleID;

        // 2. Get base role permissions
        const rolePermsQuery = await adminDb.collection('MT_RolePermission').where('RoleID', '==', roleID).get();
        const rolePerms: Record<string, any> = {};
        rolePermsQuery.docs.forEach(d => {
            const data = d.data();
            rolePerms[data.ModuleName] = { ...data };
        });

        // 3. Get user overrides
        const overridesQuery = await adminDb.collection('MT_UserOverride').where('UserID', '==', userID).get();
        const overrides: Record<string, any> = {};
        overridesQuery.docs.forEach(d => {
            const data = d.data();
            overrides[data.ModuleName] = { ...data };
        });

        return NextResponse.json({ success: true, rolePerms, overrides });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth(req, 'Users', 'CanEdit');
    if (error) return error;

    try {
        const { id: userID } = await params;
        const body = await req.json();
        const { overrides } = body;

        const batch = adminDb.batch();

        // 1. Delete existing overrides for this user
        const existingQuery = await adminDb.collection('MT_UserOverride').where('UserID', '==', userID).get();
        existingQuery.docs.forEach(d => {
            batch.delete(d.ref);
        });

        // 2. Insert new overrides
        for (const [moduleName, perms] of Object.entries(overrides || {})) {
            const p = perms as any;

            // Note: we save the override even if they are all false, to explicitly DENY access
            // that a role might otherwise grant.
            const newRef = adminDb.collection('MT_UserOverride').doc();
            batch.set(newRef, {
                UserID: userID,
                ModuleName: moduleName,
                CanView: p.CanView === true || String(p.CanView).toLowerCase() === 'true',
                CanAdd: p.CanAdd === true || String(p.CanAdd).toLowerCase() === 'true',
                CanEdit: p.CanEdit === true || String(p.CanEdit).toLowerCase() === 'true',
                CanDelete: p.CanDelete === true || String(p.CanDelete).toLowerCase() === 'true',
                CreatedAt: admin.firestore.FieldValue.serverTimestamp(),
                UpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        await batch.commit();

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
