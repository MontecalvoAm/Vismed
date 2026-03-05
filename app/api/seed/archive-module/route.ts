// ============================================================
//  VisayasMed — API: GET /api/seed/archive-module
//  Seeds the Archive module in M_Module and adds Archive
//  permissions to ALL roles in MT_RolePermission.
// ============================================================

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

export async function GET() {
    try {
        // 1. Add Archive module to M_Module
        await adminDb.collection('M_Module').doc('archive').set({
            ModuleID: 'archive',
            ModuleName: 'Archive',
            Label: 'Archive',
            Path: '/archive',
            Icon: 'Archive',
            SortOrder: 99,
            IsActive: true,
            CreatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // 2. Get ALL roles (not just Admin) to ensure every role gets Archive permissions
        const rolesSnap = await adminDb.collection('M_Role').get();

        const seededRoles: string[] = [];
        for (const roleDoc of rolesSnap.docs) {
            const roleId = roleDoc.id;
            const roleName = roleDoc.data().RoleName ?? roleId;
            await adminDb.collection('MT_RolePermission').doc(`${roleId}_archive`).set({
                RoleID: roleId,
                ModuleID: 'archive',
                ModuleName: 'Archive',
                CanView: true,
                CanAdd: false,
                CanEdit: true,
                CanDelete: true,
                UpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            seededRoles.push(roleName);
        }

        return NextResponse.json({
            success: true,
            message: `Archive module seeded. Logout and log back in (or wait 60s) for the sidebar link to appear.`,
            rolesSeeded: seededRoles,
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
