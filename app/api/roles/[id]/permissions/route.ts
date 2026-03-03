import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAuth } from '@/lib/auth/serverAuth';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: roleID } = await params;

        // Get base role permissions
        const rolePermsQuery = await adminDb.collection('MT_RolePermission').where('RoleID', '==', roleID).get();
        const rolePerms: Record<string, any> = {};
        rolePermsQuery.docs.forEach(d => {
            const data = d.data();
            rolePerms[data.ModuleName] = { ...data };
        });

        return NextResponse.json({ success: true, permissions: rolePerms });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth(req, 'Users', 'CanEdit'); // Role mgmt tied to Users module
    if (error) return error;
    try {
        const { id: roleID } = await params;
        const body = await req.json();
        const { permissions } = body;

        const batch = adminDb.batch();

        // 1. Delete existing permissions for this role
        const existingQuery = await adminDb.collection('MT_RolePermission').where('RoleID', '==', roleID).get();
        existingQuery.docs.forEach(d => {
            batch.delete(d.ref);
        });

        // 2. Insert new permissions
        for (const [moduleName, perms] of Object.entries(permissions || {})) {
            const p = perms as any;

            const newRef = adminDb.collection('MT_RolePermission').doc();
            batch.set(newRef, {
                RoleID: roleID,
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
