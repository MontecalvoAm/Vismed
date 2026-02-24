// ============================================================
//  VisayasMed — API: GET /api/auth/me
//  Uses Firebase REST APIs only — no service account needed.
//  Token verified via Identity Toolkit REST API.
//  Firestore reads via Firestore REST API, authenticated with
//  the user's own ID token so it satisfies security rules.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/** Parse a Firestore REST document fields object into a plain JS object */
function parseDoc(fields: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(fields)) {
        if (val.stringValue !== undefined) result[key] = val.stringValue;
        else if (val.booleanValue !== undefined) result[key] = val.booleanValue;
        else if (val.integerValue !== undefined) result[key] = Number(val.integerValue);
        else if (val.doubleValue !== undefined) result[key] = val.doubleValue;
        else if (val.timestampValue !== undefined) result[key] = val.timestampValue;
        else if (val.mapValue?.fields) result[key] = parseDoc(val.mapValue.fields);
        else result[key] = null;
    }
    return result;
}

/** GET a single Firestore document — authenticated with user's ID token */
async function getDocument(
    collection: string,
    docId: string,
    idToken: string
): Promise<Record<string, any> | null> {
    const url = `${FS_BASE}/${collection}/${encodeURIComponent(docId)}`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) {
        console.error(`[getDocument] ${collection}/${docId} → HTTP ${res.status}`);
        return null;
    }
    const data = await res.json();
    if (!data.fields) return null;
    return parseDoc(data.fields);
}

/** Run a Firestore WHERE query — authenticated with user's ID token */
async function queryCollection(
    collection: string,
    field: string,
    value: string,
    idToken: string
): Promise<Record<string, any>[]> {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    const body = {
        structuredQuery: {
            from: [{ collectionId: collection }],
            where: {
                fieldFilter: {
                    field: { fieldPath: field },
                    op: 'EQUAL',
                    value: { stringValue: value },
                },
            },
        },
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        console.error(`[queryCollection] ${collection} WHERE ${field}=${value} → HTTP ${res.status}`);
        return [];
    }
    const results = await res.json();
    return results
        .filter((r: any) => r.document?.fields)
        .map((r: any) => parseDoc(r.document.fields));
}

export async function GET(req: NextRequest) {
    const token = req.cookies.get('vm_token')?.value;

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Verify Firebase ID token via Identity Toolkit REST API
        const verifyRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: token }),
            }
        );

        if (!verifyRes.ok) {
            return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
        }

        const verifyData = await verifyRes.json();
        if (!verifyData.users?.length) {
            return NextResponse.json({ error: 'User not found.' }, { status: 401 });
        }

        const UserID: string = verifyData.users[0].localId;

        // 2. Get M_User record (pass idToken so Firestore auth rules are satisfied)
        const userRecord = await getDocument('M_User', UserID, token);
        if (!userRecord) {
            return NextResponse.json(
                { error: 'Account not configured. Contact your administrator.' },
                { status: 403 }
            );
        }
        if (!userRecord.IsActive) {
            return NextResponse.json({ error: 'Account is inactive.' }, { status: 403 });
        }

        const RoleID: string = userRecord.RoleID;

        // 3. Get Role name
        const roles = await queryCollection('M_Role', 'RoleID', RoleID, token);
        const roleName: string = roles[0]?.RoleName ?? 'Unknown';

        // 4. Resolve Hybrid RBAC — base role permissions
        const resolved: Record<string, any> = {};

        const rolePerms = await queryCollection('MT_RolePermission', 'RoleID', RoleID, token);
        for (const perm of rolePerms) {
            resolved[perm.ModuleName] = {
                CanView: perm.CanView ?? false,
                CanAdd: perm.CanAdd ?? false,
                CanEdit: perm.CanEdit ?? false,
                CanDelete: perm.CanDelete ?? false,
            };
        }

        // 5. User-specific overrides (take priority)
        const overrides = await queryCollection('MT_UserOverride', 'UserID', UserID, token);
        for (const ov of overrides) {
            resolved[ov.ModuleName] = {
                CanView: ov.CanView ?? false,
                CanAdd: ov.CanAdd ?? false,
                CanEdit: ov.CanEdit ?? false,
                CanDelete: ov.CanDelete ?? false,
            };
        }

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
