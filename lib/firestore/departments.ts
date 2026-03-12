// ============================================================
//  VisayasMed — Client-side Adapter: Departments
//  Calls local API instead of direct Firebase
// ============================================================

export interface Department {
    DepartmentID: string;
    DepartmentName: string;
    Icon?: string;
    Description: string;
    SortOrder: number;
    IsActive: boolean;
    IsDeleted?: boolean;
    CreatedAt?: any;
    CreatedBy?: string;
    UpdatedAt?: any;
    UpdatedBy?: string;
}

export async function getDepartments(): Promise<Department[]> {
    const res = await fetch('/api/departments');
    if (!res.ok) throw new Error('Failed to fetch departments');
    
    const data = await res.json();
    return data.departments || [];
}

export async function getArchivedDepartments(): Promise<Department[]> {
    const res = await fetch('/api/archive?tab=departments');
    if (!res.ok) throw new Error('Failed to fetch archived departments');
    
    const data = await res.json();
    return data.records || [];
}

export async function addDepartment(
    data: Omit<Department, 'DepartmentID' | 'CreatedAt' | 'UpdatedAt'>,
    createdBy: string
): Promise<string> {
    const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...data,
            CreatedBy: createdBy
        })
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add department');
    }

    const { id } = await res.json();
    return id;
}

export async function updateDepartment(
    DepartmentID: string,
    data: Partial<Department>,
    updatedBy: string
): Promise<void> {
    const res = await fetch(`/api/departments/${DepartmentID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, UpdatedBy: updatedBy })
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update department');
    }
}

export async function deleteDepartment(DepartmentID: string, updatedBy: string): Promise<void> {
    const res = await fetch(`/api/departments/${DepartmentID}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ UpdatedBy: updatedBy })
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete department');
    }
}

