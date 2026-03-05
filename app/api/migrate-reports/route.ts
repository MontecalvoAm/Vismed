import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET() {
    try {
        const batch = adminDb.batch();

        // 1. Migrate Module from 'history' to 'reports'
        const historyModuleRef = adminDb.collection('M_Module').doc('history');
        const historyModuleSnap = await historyModuleRef.get();

        if (historyModuleSnap.exists) {
            // Delete old history module
            batch.delete(historyModuleRef);

            // Create new reports module
            const reportsModuleRef = adminDb.collection('M_Module').doc('reports');
            batch.set(reportsModuleRef, {
                ModuleID: 'reports',
                ModuleName: 'Reports',
                Label: 'Reports',
                Path: '/reports',
                Icon: 'ClipboardList',
                SortOrder: 2,
                IsActive: true,
                CreatedAt: new Date().toISOString()
            });
        } else {
            // Create new reports module if it doesn't already exist from a previous run
            const reportsModuleRef = adminDb.collection('M_Module').doc('reports');
            const reportsModuleSnap = await reportsModuleRef.get();
            if (!reportsModuleSnap.exists) {
                batch.set(reportsModuleRef, {
                    ModuleID: 'reports',
                    ModuleName: 'Reports',
                    Label: 'Reports',
                    Path: '/reports',
                    Icon: 'ClipboardList',
                    SortOrder: 2,
                    IsActive: true,
                    CreatedAt: new Date().toISOString()
                });
            }
        }

        // 2. Migrate Role Permissions
        const permsRef = adminDb.collection('MT_RolePermission');
        const q = permsRef.where('ModuleName', '==', 'History');
        const querySnapshot = await q.get();

        querySnapshot.forEach((document) => {
            const permRef = adminDb.collection('MT_RolePermission').doc(document.id);
            batch.update(permRef, {
                ModuleName: 'Reports'
            });
        });

        // Execute batch write
        await batch.commit();

        return NextResponse.json({ success: true, message: 'Migration completed. History module and permissions renamed to Reports.' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
