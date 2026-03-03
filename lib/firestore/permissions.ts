// ============================================================
//  VisayasMed — Hybrid RBAC Permission Resolver
//  Merges MT_RolePermission defaults + MT_UserOverride records
//  Backend skill: backend-visayasmed
// ============================================================

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type ModulePermissions = {
    CanView: boolean;
    CanAdd: boolean;
    CanEdit: boolean;
    CanDelete: boolean;
};

export type ResolvedPermissions = Record<string, ModulePermissions>;

const DENY_ALL: ModulePermissions = {
    CanView: false,
    CanAdd: false,
    CanEdit: false,
    CanDelete: false,
};

/**
 * Resolves final permissions for a user by:
 * 1. Loading base role permissions from MT_RolePermission
 * 2. Loading user-specific overrides from MT_UserOverride
 * 3. Merging: MT_UserOverride takes priority over MT_RolePermission
 * Fail-secure: any missing module defaults to DENY_ALL
 */
export async function resolvePermissions(
    UserID: string,
    RoleID: string
): Promise<ResolvedPermissions> {
    const resolved: ResolvedPermissions = {};

    // Step 1: Load base role permissions
    const rolePermQ = query(
        collection(db, 'MT_RolePermission'),
        where('RoleID', '==', RoleID)
    );
    const rolePermSnap = await getDocs(rolePermQ);
    rolePermSnap.docs.forEach((d) => {
        const data = d.data();
        resolved[data.ModuleName] = {
            CanView: data.CanView ?? false,
            CanAdd: data.CanAdd ?? false,
            CanEdit: data.CanEdit ?? false,
            CanDelete: data.CanDelete ?? false,
        };
    });

    // Step 2: Load user-specific overrides and apply them
    const overrideQ = query(
        collection(db, 'MT_UserOverride'),
        where('UserID', '==', UserID)
    );
    const overrideSnap = await getDocs(overrideQ);
    overrideSnap.docs.forEach((d) => {
        const data = d.data();
        // Override takes full priority — replaces base role permission for that module
        resolved[data.ModuleName] = {
            CanView: data.CanView ?? false,
            CanAdd: data.CanAdd ?? false,
            CanEdit: data.CanEdit ?? false,
            CanDelete: data.CanDelete ?? false,
        };
    });

    return resolved;
}

/**
 * Helper: get permissions for a specific module (fail-secure default)
 */
export function getModulePerms(
    permissions: ResolvedPermissions,
    moduleName: string
): ModulePermissions {
    return permissions[moduleName] ?? DENY_ALL;
}
