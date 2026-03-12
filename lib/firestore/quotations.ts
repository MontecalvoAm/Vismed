// ============================================================
//  VisayasMed — Client-side Adapter: Quotations
//  Calls local API instead of direct Firebase/Prisma
// ============================================================

export interface QuotationItem {
    Id: string;
    Name: string;
    Department: string;
    Price: number;
    Quantity: number;
    Used?: number;
    Unit?: string;
}

export interface QuotationRecord {
    id?: string;
    DocumentNo?: string;
    CustomerName?: string;
    CustomerFirstName?: string;
    CustomerMiddleName?: string;
    CustomerLastName?: string;
    CustomerDob?: string;
    CustomerGender?: string;
    CustomerEmail?: string;
    CustomerPhone?: string;
    CustomerAddress?: string;
    CustomerNotes?: string;
    HospitalName?: string;
    PreparedBy?: string;
    GuarantorId?: string | null;
    GuarantorName?: string | null;
    SessionType?: 'One-time' | 'Per-session';
    PaymentStatus?: 'Paid' | 'Unpaid' | 'None';
    Items: QuotationItem[];
    Subtotal: number;
    Vat: number;
    Total: number;
    Status: string;
    IsDeleted?: boolean;
    CreatedAt?: any;
    UpdatedAt?: any;
}

export function computeTotalQuantity(items: QuotationItem[]): number {
    return items.reduce((sum, i) => sum + (i.Quantity || 0), 0);
}

export function computeUsedQuantity(items: QuotationItem[]): number {
    return items.reduce((sum, i) => sum + (i.Used || 0), 0);
}

export async function getQuotations(): Promise<QuotationRecord[]> {
    const res = await fetch('/api/quotations');
    if (!res.ok) throw new Error('Failed to fetch quotations');
    
    const data = await res.json();
    return (data.quotations || []).map((q: any) => ({
        ...q,
        id: q.QuotationID,
        Items: (q.Items || []).map((i: any) => ({
            ...i,
            Id: i.ItemID,
        }))
    }));
}

export async function getQuotationById(id: string): Promise<QuotationRecord | null> {
    const res = await fetch(`/api/quotations/${id}`);
    if (!res.ok) return null;
    
    const data = await res.json();
    if (!data.success) return null;
    
    const q = data.quotation;
    return {
        ...q,
        id: q.QuotationID,
        Items: (q.Items || []).map((i: any) => ({
            ...i,
            Id: i.ItemID,
        }))
    };
}

export async function getQuotationsByGuarantor(guarantorId: string): Promise<QuotationRecord[]> {
    const res = await fetch(`/api/quotations?guarantorId=${guarantorId}`);
    if (!res.ok) throw new Error('Failed to fetch quotations by guarantor');
    
    const data = await res.json();
    return (data.quotations || []).map((q: any) => ({
        ...q,
        id: q.QuotationID,
        Items: (q.Items || []).map((i: any) => ({
            ...i,
            Id: i.ItemID,
        }))
    }));
}

export async function updateQuotationStatus(
    id: string,
    Status: string
): Promise<void> {
    const res = await fetch(`/api/quotations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Status })
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update quotation status');
    }
}

export async function updateQuotation(
    id: string,
    payload: any
): Promise<void> {
    const res = await fetch(`/api/quotations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update quotation');
    }
}

export async function deleteQuotation(id: string): Promise<void> {
    const res = await fetch(`/api/quotations/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete quotation');
    }
}
