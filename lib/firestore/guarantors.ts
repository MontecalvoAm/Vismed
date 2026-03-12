// ============================================================
//  VisayasMed — Client-side Adapter: Guarantors
//  Calls local API instead of direct Firebase
// ============================================================

export interface GuarantorRecord {
    id?: string;
    Name: string;
    Description?: string;
    IsDeleted?: boolean;
    CreatedAt?: any;
    UpdatedAt?: any;
    SortOrder?: number;
    IsActive?: boolean;
}

export async function addGuarantor(
    data: Omit<GuarantorRecord, 'id' | 'CreatedAt' | 'UpdatedAt'>
): Promise<string> {
    const res = await fetch('/api/guarantors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            GuarantorName: data.Name,
            Description: data.Description || '',
            SortOrder: data.SortOrder || 0,
            IsActive: data.IsActive !== undefined ? data.IsActive : true,
        })
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add guarantor');
    }

    const { id } = await res.json();
    return id;
}

export async function getGuarantors(): Promise<GuarantorRecord[]> {
    const res = await fetch('/api/guarantors');
    if (!res.ok) throw new Error('Failed to fetch guarantors');
    
    const data = await res.json();
    return (data.guarantors || []).map((g: any) => ({
        id: g.GuarantorID,
        Name: g.Name,
        Description: g.Description,
        IsDeleted: g.IsDeleted,
        CreatedAt: g.CreatedAt,
        UpdatedAt: g.UpdatedAt,
        SortOrder: g.SortOrder,
        IsActive: g.IsActive,
    }));
}

export async function getArchivedGuarantors(): Promise<GuarantorRecord[]> {
    const res = await fetch('/api/archive?tab=guarantors');
    if (!res.ok) throw new Error('Failed to fetch archived guarantors');
    
    const data = await res.json();
    return (data.records || []).map((g: any) => ({
        id: g.GuarantorID,
        Name: g.Name,
        Description: g.Description,
        IsDeleted: g.IsDeleted,
        CreatedAt: g.CreatedAt,
        UpdatedAt: g.UpdatedAt,
        SortOrder: g.SortOrder,
        IsActive: g.IsActive,
    }));
}

export async function getGuarantorById(id: string): Promise<GuarantorRecord | null> {
    const res = await fetch(`/api/guarantors/${id}`);
    if (!res.ok) return null;
    
    const data = await res.json();
    if (!data.success) return null;
    
    const g = data.guarantor;
    return {
        id: g.GuarantorID,
        Name: g.Name,
        Description: g.Description,
        IsDeleted: g.IsDeleted,
        CreatedAt: g.CreatedAt,
        UpdatedAt: g.UpdatedAt,
        SortOrder: g.SortOrder,
        IsActive: g.IsActive,
    };
}

export async function updateGuarantor(
    id: string,
    data: Partial<Omit<GuarantorRecord, 'id' | 'CreatedAt' | 'UpdatedAt'>>
): Promise<void> {
    const payload: any = {};
    if (data.Name) payload.GuarantorName = data.Name;
    if (data.Description !== undefined) payload.Description = data.Description;
    if (data.SortOrder !== undefined) payload.SortOrder = data.SortOrder;
    if (data.IsActive !== undefined) payload.IsActive = data.IsActive;

    const res = await fetch(`/api/guarantors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update guarantor');
    }
}

export async function deleteGuarantor(id: string): Promise<void> {
    const res = await fetch(`/api/guarantors/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete guarantor');
    }
}
