// ============================================================
//  VisayasMed — Client-side Adapter: Services
//  Calls local API instead of direct Firebase
// ============================================================

export interface Service {
    ServiceID: string;
    DepartmentID: string;
    ServiceName: string;
    Price: number;
    Unit: string;
    Description: string;
    IsActive: boolean;
    IsDeleted?: boolean;
    CreatedAt?: any;
    CreatedBy?: string;
    UpdatedAt?: any;
    UpdatedBy?: string;
}

export async function getAllServices(): Promise<Service[]> {
    const res = await fetch('/api/services');
    if (!res.ok) throw new Error('Failed to fetch services');
    
    const data = await res.json();
    return data.services || [];
}

export async function getArchivedServices(): Promise<Service[]> {
    const res = await fetch('/api/archive?tab=services');
    if (!res.ok) throw new Error('Failed to fetch archived services');
    
    const data = await res.json();
    return data.records || [];
}

export async function getServicesByDept(DepartmentID: string): Promise<Service[]> {
    const res = await fetch(`/api/services?DepartmentID=${DepartmentID}`);
    if (!res.ok) throw new Error('Failed to fetch services for department');
    
    const data = await res.json();
    return data.services || [];
}

export async function addService(
    data: Omit<Service, 'ServiceID' | 'CreatedAt' | 'UpdatedAt'>,
    createdBy: string
): Promise<void> {
    const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...data,
            CreatedBy: createdBy
        })
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add service');
    }
}

export async function updateService(
    ServiceID: string,
    data: Partial<Service>,
    updatedBy: string
): Promise<void> {
    const res = await fetch(`/api/services/${ServiceID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, UpdatedBy: updatedBy })
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update service');
    }
}

export async function deleteService(ServiceID: string, updatedBy: string): Promise<void> {
    const res = await fetch(`/api/services/${ServiceID}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ UpdatedBy: updatedBy })
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete service');
    }
}
