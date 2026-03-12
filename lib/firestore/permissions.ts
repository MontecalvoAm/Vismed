// ============================================================
//  VisayasMed — Client-side Adapter: Permissions
//  Role-Based Access Control (RBAC) resolved on backend
// ============================================================

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
 * DEPRECATED: Permissions are now resolved on the backend via /api/auth/me
 * and provided through the AuthContext.
 */
export async function resolvePermissions(
    UserID: string,
    RoleID: string
): Promise<ResolvedPermissions> {
    console.warn('[Permissions] resolvePermissions is deprecated. Use AuthContext permissions instead.');
    return {};
}

/**
 * Helper: get permissions for a specific module (fail-secure default)
 */
export function getModulePerms(
    permissions: ResolvedPermissions,
    moduleName: string
): ModulePermissions {
    if (!permissions) return DENY_ALL;
    return permissions[moduleName] ?? DENY_ALL;
}
