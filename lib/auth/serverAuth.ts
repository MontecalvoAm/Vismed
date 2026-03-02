import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

export type ActionType = 'CanView' | 'CanAdd' | 'CanEdit' | 'CanDelete';

export interface ValidatedUser {
    UserID: string;
    RoleID: string;
    Permissions: Record<string, {
        CanView: boolean;
        CanAdd: boolean;
        CanEdit: boolean;
        CanDelete: boolean;
    }>;
}

export async function requireAuth(req: NextRequest, moduleName: string, action: ActionType): Promise<{ user?: ValidatedUser; error?: NextResponse }> {
    const token = req.cookies.get('vm_token')?.value;

    if (!token) {
        return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
    }

    try {
        // 1. Verify Firebase ID token
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(token);
        } catch (authErr: any) {
            console.error('Token verification failed:', authErr.message);
            return { error: NextResponse.json({ success: false, error: 'Session expired. Please log in again.' }, { status: 401 }) };
        }

        const UserID = decodedToken.uid;

        // 2. Get M_User record
        const userDoc = await adminDb.collection('M_User').doc(UserID).get();
        if (!userDoc.exists) {
            return { error: NextResponse.json({ success: false, error: 'Account not configured. Contact your administrator.' }, { status: 403 }) };
        }

        const userRecord = userDoc.data()!;
        if (!userRecord.IsActive) {
            return { error: NextResponse.json({ success: false, error: 'Account is inactive.' }, { status: 403 }) };
        }

        const RoleID: string = userRecord.RoleID;

        // 3. Resolve Hybrid RBAC
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

        // 4. User-specific overrides (take priority)
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

        const userPermissions = resolved[moduleName] || { CanView: false, CanAdd: false, CanEdit: false, CanDelete: false };

        if (!userPermissions[action]) {
            return { error: NextResponse.json({ success: false, error: `Forbidden: Missing ${action} permission for ${moduleName}` }, { status: 403 }) };
        }

        return {
            user: {
                UserID,
                RoleID,
                Permissions: resolved
            }
        };

    } catch (err: any) {
        console.error('Server Auth Error:', err?.message ?? err);
        return { error: NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 }) };
    }
}
