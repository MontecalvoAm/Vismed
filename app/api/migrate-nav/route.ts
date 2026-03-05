import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const batch = adminDb.batch();

        // 1. Update module sort orders and upsert "logs"
        const modules = [
            { id: 'quotations', order: 1 },
            { id: 'guarantors', order: 2 },
            { id: 'departments', order: 3 },
            { id: 'services', order: 4 },
            { id: 'reports', order: 5 },
            { id: 'logs', order: 6, isNew: true },
            { id: 'users', order: 7 }
        ];

        for (const mod of modules) {
            const ref = adminDb.collection('M_Module').doc(mod.id);
            if (mod.isNew) {
                batch.set(ref, {
                    ModuleID: 'logs',
                    ModuleName: 'Logs',
                    Label: 'Logs',
                    Path: '/reports/audit-logs',
                    Icon: 'History',
                    SortOrder: 6,
                    IsActive: true,
                    CreatedAt: new Date().toISOString()
                }, { merge: true });
            } else {
                batch.update(ref, { SortOrder: mod.order });
            }
        }

        // 2. Grant Permissions to all Roles for 'Logs'
        const rolesSnap = await adminDb.collection('M_Role').get();

        for (const roleDoc of rolesSnap.docs) {
            const roleId = roleDoc.id;

            // Check if permission already exists to avoid duplication errors
            const permSnap = await adminDb.collection('MT_RolePermission')
                .where('RoleID', '==', roleId)
                .where('ModuleName', '==', 'Logs')
                .get();

            if (permSnap.empty) {
                const permRef = adminDb.collection('MT_RolePermission').doc();
                batch.set(permRef, {
                    PermissionID: permRef.id,
                    RoleID: roleId,
                    ModuleName: 'Logs',
                    CanView: true,
                    CanAdd: true,
                    CanEdit: true,
                    CanDelete: true
                });
            }
        }

        await batch.commit();

        return NextResponse.json({ success: true, message: 'Navigation migration completed successfully.' });
    } catch (e: any) {
        console.error("Migration Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
