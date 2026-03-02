import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const snap = await adminDb.collection('M_Module')
            .where('IsActive', '==', true)
            .get();

        const modules = snap.docs.map(d => {
            const data = d.data();
            return {
                ModuleID: d.id,
                ModuleName: data.ModuleName,
                Label: data.Label,
                Path: data.Path,
                Icon: data.Icon,
                SortOrder: data.SortOrder ?? 99,
                IsActive: data.IsActive
            };
        });

        // Sort in memory to avoid needing a Firestore composite index
        modules.sort((a, b) => a.SortOrder - b.SortOrder);

        return NextResponse.json({ success: true, modules });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
