// ============================================================
//  VisayasMed — API: GET /api/quotations
//  GET → client Firestore SDK (works without service account)
//  Fetches all records from T_Quotation ordered by CreatedAt
// ============================================================

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';

const COL = 'T_Quotation';

export async function GET() {
    try {
        let snap;
        try {
            snap = await getDocs(query(collection(db, COL), orderBy('CreatedAt', 'desc')));
        } catch {
            // Fallback if composite index not ready
            snap = await getDocs(collection(db, COL));
        }

        const quotations = snap.docs.map((d) => {
            const data = d.data();
            return {
                id: d.id,
                ...data,
                CreatedAt:
                    data.CreatedAt instanceof Timestamp
                        ? data.CreatedAt.toDate().toISOString()
                        : data.CreatedAt ?? null,
                UpdatedAt:
                    data.UpdatedAt instanceof Timestamp
                        ? data.UpdatedAt.toDate().toISOString()
                        : data.UpdatedAt ?? null,
            };
        });

        return NextResponse.json({ success: true, quotations });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
