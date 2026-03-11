import { cookies } from 'next/headers';
import { adminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';
import { permCache, CACHE_TTL_MS } from '@/lib/permCache';

export async function getServerUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get('vm_token')?.value;
    const sessionId = cookieStore.get('vm_session_id')?.value;

    if (!token) return null;

    try {
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(token);
        } catch (authErr: any) {
            console.error('[getServerUser] Token verification failed:', authErr.message);
            return null; // Expired or invalid
        }

        const UserID = decodedToken.uid;

        // Check Cache first
        const cached = permCache.get(UserID);
        if (cached && Date.now() < cached.expiresAt && cached.sessionId === sessionId) {
            return cached.data;
        }

        // Fetch User
        const userDoc = await adminDb.collection('M_User').doc(UserID).get();
        if (!userDoc.exists) return null;

        const userRecord = userDoc.data()!;
        if (!userRecord.IsActive || (userRecord.CurrentSessionID && userRecord.CurrentSessionID !== sessionId)) {
            return null;
        }

        const RoleID: string = userRecord.RoleID;

        // Fetch permissions in parallel
        const [roleDoc, rolePermsSnap, overridesSnap] = await Promise.all([
            adminDb.collection('M_Role').doc(RoleID).get(),
            adminDb.collection('MT_RolePermission').where('RoleID', '==', RoleID).get(),
            adminDb.collection('MT_UserOverride').where('UserID', '==', UserID).get(),
        ]);

        const roleName: string = roleDoc.exists ? roleDoc.data()?.RoleName : 'Unknown';
        const resolved: Record<string, any> = {};

        rolePermsSnap.docs.forEach(d => {
            const perm = d.data();
            resolved[perm.ModuleName] = {
                CanView: String(perm.CanView).toLowerCase() === 'true',
                CanAdd: String(perm.CanAdd).toLowerCase() === 'true',
                CanEdit: String(perm.CanEdit).toLowerCase() === 'true',
                CanDelete: String(perm.CanDelete).toLowerCase() === 'true',
            };
        });

        overridesSnap.docs.forEach(d => {
            const ov = d.data();
            resolved[ov.ModuleName] = {
                CanView: String(ov.CanView).toLowerCase() === 'true',
                CanAdd: String(ov.CanAdd).toLowerCase() === 'true',
                CanEdit: String(ov.CanEdit).toLowerCase() === 'true',
                CanDelete: String(ov.CanDelete).toLowerCase() === 'true',
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

        // Cache for 60 seconds
        permCache.set(UserID, { data: responseData, expiresAt: Date.now() + CACHE_TTL_MS, sessionId });

        return responseData;

    } catch (err) {
        console.error('[getServerUser] Error fetching user:', err);
        return null;
    }
}
