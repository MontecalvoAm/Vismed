// ============================================================
//  VisayasMed — API: GET /api/auth/me
//  Refactored to use Firebase Admin SDK to reliably bypass
//  Firestore security rules when reading RBAC overrides.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const token = req.cookies.get('vm_token')?.value;

    if (!token) {
        return NextResponse.json({ authenticated: false, error: 'Unauthorized' }, { status: 200 });
    }

    try {
        // 1. Verify Firebase ID token
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(token);
        } catch (authErr: any) {
            console.error('Token verification failed:', authErr.message);

            // Check if it's an expired token error
            const isExpired = authErr.code === 'auth/id-token-expired';

            return NextResponse.json({
                authenticated: false,
                error: 'Session expired. Please log in again.',
                tokenExpired: isExpired
            }, { status: 200 });
        }

        const UserID = decodedToken.uid;

        // 2. Get M_User record
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

        // 3. Get Role name
        const roleDoc = await adminDb.collection('M_Role').doc(RoleID).get();
        const roleName: string = roleDoc.exists ? roleDoc.data()?.RoleName : 'Unknown';

        // 4. Resolve Hybrid RBAC — base role permissions
        const resolved: Record<string, any> = {};

        const rolePermsQuery = await adminDb.collection('MT_RolePermission').where('RoleID', '==', RoleID).get();
        rolePermsQuery.docs.forEach(d => {
            const perm = d.data();
            resolved[perm.ModuleName] = {
                CanView: perm.CanView === true || String(perm.CanView).toLowerCase() === 'true',
                CanAdd: perm.CanAdd === true || String(perm.CanAdd).toLowerCase() === 'true',
                CanEdit: perm.CanEdit === true || String(perm.CanEdit).toLowerCase() === 'true',
                CanDelete: perm.CanDelete === true || String(perm.CanDelete).toLowerCase() === 'true',
            };
        });

        // 5. User-specific overrides (take priority)
        const overridesQuery = await adminDb.collection('MT_UserOverride').where('UserID', '==', UserID).get();
        overridesQuery.docs.forEach(d => {
            const ov = d.data();
            resolved[ov.ModuleName] = {
                CanView: ov.CanView === true || String(ov.CanView).toLowerCase() === 'true',
                CanAdd: ov.CanAdd === true || String(ov.CanAdd).toLowerCase() === 'true',
                CanEdit: ov.CanEdit === true || String(ov.CanEdit).toLowerCase() === 'true',
                CanDelete: ov.CanDelete === true || String(ov.CanDelete).toLowerCase() === 'true',
            };
        });

        return NextResponse.json({
            UserID,
            Email: userRecord.Email,
            FirstName: userRecord.FirstName,
            LastName: userRecord.LastName,
            RoleID,
            RoleName: roleName,
            Permissions: resolved,
        });
    } catch (err: any) {
        console.error('[/api/auth/me] Unexpected error:', err?.message ?? err);
        return NextResponse.json({ error: 'Server error: ' + (err?.message ?? 'unknown') }, { status: 500 });
    }
}
