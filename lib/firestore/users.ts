// ============================================================
//  VisayasMed — Client-side Adapter: Users
//  Calls local API instead of direct Firebase
// ============================================================

export interface UserRecord {
    UserID: string;
    Email: string;
    FirstName: string;
    LastName: string;
    RoleID: string;
    DepartmentID?: string;
    Department?: any;
    IsActive: boolean;
    IsDeleted?: boolean;
    CreatedAt?: any;
    UpdatedAt?: any;
    UpdatedBy?: string;
}

export async function getUserRecord(UserID: string): Promise<UserRecord | null> {
    const res = await fetch(`/api/users/${UserID}`);
    if (!res.ok) return null;
    
    const data = await res.json();
    if (!data.success) return null;
    
    return data.user as UserRecord;
}

export async function getAllUsers(): Promise<UserRecord[]> {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Failed to fetch users');
    
    const data = await res.json();
    return data.users || [];
}

export async function getArchivedUsers(): Promise<UserRecord[]> {
    const res = await fetch('/api/archive?tab=users');
    if (!res.ok) throw new Error('Failed to fetch archived users');
    
    const data = await res.json();
    return data.records || [];
}

export async function updateUserRole(
    UserID: string,
    RoleID: string,
    updatedBy: string
): Promise<void> {
    const res = await fetch(`/api/users/${UserID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ RoleID, UpdatedBy: updatedBy }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update user role');
    }
}

export async function setUserActiveStatus(
    UserID: string,
    IsActive: boolean,
    updatedBy: string
): Promise<void> {
    const res = await fetch(`/api/users/${UserID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ IsActive, UpdatedBy: updatedBy }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to set user active status');
    }
}
