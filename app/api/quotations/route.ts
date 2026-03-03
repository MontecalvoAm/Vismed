// ============================================================
//  VisayasMed — API: GET /api/quotations
//  GET → admin Firestore SDK (server-side)
//  Fetches all records from T_Quotation ordered by CreatedAt
// ============================================================

import { NextResponse, NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from '@/lib/rateLimit';
import { errorResponse, successResponse } from '@/lib/errors';

const COL = 'T_Quotation';

export async function GET(req: NextRequest) {
    try {
        // Rate limiting for API
        const clientIp = getClientIp(req);
        const rateLimitResult = checkRateLimit(`api:${clientIp}`, RATE_LIMITS.API);
        if (!rateLimitResult.success) {
            return rateLimitResponse(rateLimitResult);
        }

        let snap;
        try {
            snap = await adminDb.collection(COL).orderBy('CreatedAt', 'desc').get();
        } catch {
            // Fallback if composite index not ready
            snap = await adminDb.collection(COL).get();
        }

        const quotations = snap.docs.map((d) => {
            const data = d.data();
            return {
                id: d.id,
                ...data,
                CreatedAt:
                    data.CreatedAt instanceof admin.firestore.Timestamp
                        ? data.CreatedAt.toDate().toISOString()
                        : data.CreatedAt ?? null,
                UpdatedAt:
                    data.UpdatedAt instanceof admin.firestore.Timestamp
                        ? data.UpdatedAt.toDate().toISOString()
                        : data.UpdatedAt ?? null,
            };
        });

        return successResponse({ success: true, quotations });
    } catch (e: unknown) {
        return errorResponse(e, 'Failed to fetch quotations');
    }
}
