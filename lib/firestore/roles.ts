// ============================================================
//  VisayasMed — Client-side Adapter: Roles
//  Calls local API instead of direct Firebase
// ============================================================

export interface Role {
    RoleID: string;
    RoleName: string;
    Description: string;
    IsActive: boolean;
    IsDeleted?: boolean;
    CreatedAt?: any;
    UpdatedAt?: any;
}

/** Get only active roles (for user assignment dropdowns) */
export async function getRoles(): Promise<Role[]> {
    try {
        const res = await fetch('/api/roles');
        if (!res.ok) return [];
        const data = await res.json();
        return (data.roles || []).filter((r: Role) => r.IsActive && !r.IsDeleted);
    } catch {
        return [];
    }
}

/** Get ALL non-deleted roles (for admin management table) */
export async function getAllRoles(): Promise<Role[]> {
    try {
        const res = await fetch('/api/roles');
        if (!res.ok) return [];
        const data = await res.json();
        return (data.roles || []).filter((r: Role) => !r.IsDeleted);
    } catch {
        return [];
    }
}

/** Get archived (soft-deleted) roles */
export async function getArchivedRoles(): Promise<Role[]> {
    try {
        const res = await fetch('/api/archive?tab=roles');
        if (!res.ok) return [];
        const data = await res.json();
        return data.records || [];
    } catch {
        return [];
    }
}
