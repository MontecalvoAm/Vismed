// ============================================================
//  VisayasMed — API: GET /api/auth/me
//  Performance-optimized: Parallel Firestore reads + 60s cache
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';
import { permCache, CACHE_TTL_MS } from '@/lib/permCache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const token = req.cookies.get('vm_token')?.value;

    if (!token) {
        return NextResponse.json({ authenticated: false, error: 'Unauthorized' }, { status: 200 });
    }

    try {
        // 1. Verify Firebase ID token — always verified, never cached
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(token);
        } catch (authErr: any) {
            console.error('Token verification failed:', authErr.message);
            const isExpired = authErr.code === 'auth/id-token-expired';
            return NextResponse.json({
                authenticated: false,
                error: 'Session expired. Please log in again.',
                tokenExpired: isExpired
            }, { status: 200 });
        }

        const UserID = decodedToken.uid;

        // 2. Return cached result if still fresh (Firestore reads skipped entirely)
        const cached = permCache.get(UserID);
        if (cached && Date.now() < cached.expiresAt) {
            return NextResponse.json(cached.data);
        }

        // 3. Parallel fetch: M_User + MT_RolePermission + MT_UserOverride simultaneously
        //    We don't know RoleID yet, so M_User must resolve first, then we fire the
        //    permission queries in parallel with the role name lookup.
        const userDoc = await adminDb.collection('M_User').doc(UserID).get();

        if (!userDoc.exists) {
            return NextResponse.json(
                { error: 'Account not configured. Contact your administrator.' },
                { status: 403 }
            );
        }

        const userRecord = userDoc.data()!;
        if (!userRecord.IsActive) {
            return NextResponse.json({ error: 'Account is inactive.' }, { status: 403 });
        }

        const RoleID: string = userRecord.RoleID;

        // 4. Run role name + role permissions + user overrides ALL in parallel
        const [roleDoc, rolePermsSnap, overridesSnap] = await Promise.all([
            adminDb.collection('M_Role').doc(RoleID).get(),
            adminDb.collection('MT_RolePermission').where('RoleID', '==', RoleID).get(),
            adminDb.collection('MT_UserOverride').where('UserID', '==', UserID).get(),
        ]);

        const roleName: string = roleDoc.exists ? roleDoc.data()?.RoleName : 'Unknown';

        // 5. Resolve Hybrid RBAC — base role permissions first
        const resolved: Record<string, any> = {};

        rolePermsSnap.docs.forEach(d => {
            const perm = d.data();
            resolved[perm.ModuleName] = {
                CanView: perm.CanView === true || String(perm.CanView).toLowerCase() === 'true',
                CanAdd: perm.CanAdd === true || String(perm.CanAdd).toLowerCase() === 'true',
                CanEdit: perm.CanEdit === true || String(perm.CanEdit).toLowerCase() === 'true',
                CanDelete: perm.CanDelete === true || String(perm.CanDelete).toLowerCase() === 'true',
            };
        });

        // 6. User-specific overrides take full priority
        overridesSnap.docs.forEach(d => {
            const ov = d.data();
            resolved[ov.ModuleName] = {
                CanView: ov.CanView === true || String(ov.CanView).toLowerCase() === 'true',
                CanAdd: ov.CanAdd === true || String(ov.CanAdd).toLowerCase() === 'true',
                CanEdit: ov.CanEdit === true || String(ov.CanEdit).toLowerCase() === 'true',
                CanDelete: ov.CanDelete === true || String(ov.CanDelete).toLowerCase() === 'true',
            };
        });

        const responseData = {
            UserID,
            Email: userRecord.Email,
            FirstName: userRecord.FirstName,
            LastName: userRecord.LastName,
            RoleID,
            RoleName: roleName,
            Permissions: resolved,
        };

        // 7. Store in cache for 60 seconds
        permCache.set(UserID, { data: responseData, expiresAt: Date.now() + CACHE_TTL_MS });

        return NextResponse.json(responseData);
    } catch (err: any) {
        console.error('[/api/auth/me] Unexpected error:', err?.message ?? err);
        return NextResponse.json({ error: 'Server error: ' + (err?.message ?? 'unknown') }, { status: 500 });
    }
}
