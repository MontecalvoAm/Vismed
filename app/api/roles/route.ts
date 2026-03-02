// ============================================================
//  VisayasMed — API: GET /api/roles  POST /api/roles
//  GET  → uses client Firestore SDK (works in dev without service account)
//  POST → uses Admin SDK (requires write auth)
// ============================================================

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

const COL = 'M_Role';

export const dynamic = 'force-dynamic';

// ── GET: list all roles ──────────────────────────────────────
export async function GET() {
    try {
        let snap;
        try {
            snap = await getDocs(query(collection(db, COL), orderBy('RoleName', 'asc')));
        } catch {
            // Fallback if index not yet built
            snap = await getDocs(collection(db, COL));
        }
        const roles = snap.docs.map((d) => ({ RoleID: d.id, ...d.data() }));
        return NextResponse.json({ success: true, roles });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

// ── POST: create a new role ──────────────────────────────────
export async function POST(req: Request) {
    try {
        const { RoleName, Description, IsActive } = await req.json();

        if (!RoleName?.trim()) {
            return NextResponse.json({ success: false, error: 'RoleName is required.' }, { status: 400 });
        }

        const ref = adminDb.collection(COL).doc();
        await ref.set({
            RoleName: RoleName.trim(),
            Description: Description?.trim() || '',
            IsActive: IsActive !== undefined ? IsActive : true,
            CreatedAt: admin.firestore.FieldValue.serverTimestamp(),
            UpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true, RoleID: ref.id });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
