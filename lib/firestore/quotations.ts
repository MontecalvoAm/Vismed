// ============================================================
//  VisayasMed — Firestore: Quotations (T_Quotation)
//  Collection renamed from 'quotations' → 'T_Quotation'
//  All fields now strictly PascalCase per DB schema rules
// ============================================================

import {
    collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
    serverTimestamp, query, orderBy, where, Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ── Interfaces ────────────────────────────────────────────────

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
    id?: string;          // Firestore document ID (runtime only)
    DocumentNo?: string;
    CustomerName?: string; // Legacy support (do not remove)
    CustomerFirstName: string;
    CustomerMiddleName?: string;
    CustomerLastName: string;
    CustomerDob?: string;
    CustomerGender?: string;
    CustomerEmail: string;
    CustomerPhone: string;
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

// ── Collection constant ───────────────────────────────────────

const COL = 'T_Quotation';

// ── Helper: compute total and used quantity ───────────
export function computeTotalQuantity(items: QuotationItem[]): number {
    return items.reduce((sum, i) => sum + (i.Quantity || 0), 0);
}

export function computeUsedQuantity(items: QuotationItem[]): number {
    return items.reduce((sum, i) => sum + (i.Used || 0), 0);
}

// ── Timestamp helper ──────────────────────────────────────────
function mapTimestamps(data: any, id: string): QuotationRecord {
    return {
        id,
        ...data,
        CreatedAt: data.CreatedAt instanceof Timestamp
            ? data.CreatedAt.toDate().toISOString()
            : data.CreatedAt ?? null,
        UpdatedAt: data.UpdatedAt instanceof Timestamp
            ? data.UpdatedAt.toDate().toISOString()
            : data.UpdatedAt ?? null,
    } as QuotationRecord;
}

// ── CRUD functions ────────────────────────────────────────────

export async function addQuotation(
    data: Omit<QuotationRecord, 'id' | 'CreatedAt' | 'UpdatedAt'>
): Promise<string> {
    const newDocRef = doc(collection(db, COL));
    await setDoc(newDocRef, {
        ...data,
        IsDeleted: false,
        CreatedAt: serverTimestamp(),
        UpdatedAt: serverTimestamp(),
    });
    return newDocRef.id;
}

export async function getQuotations(): Promise<QuotationRecord[]> {
    const q = query(collection(db, COL), orderBy('CreatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs
        .map((d) => mapTimestamps(d.data(), d.id))
        .filter((q) => q.IsDeleted !== true);
}

export async function getArchivedQuotations(): Promise<QuotationRecord[]> {
    const snap = await getDocs(collection(db, COL));
    return snap.docs
        .map((d) => mapTimestamps(d.data(), d.id))
        .filter((q) => q.IsDeleted === true)
        .sort((a, b) => {
            if (!a.CreatedAt) return 1;
            if (!b.CreatedAt) return -1;
            return new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime();
        });
}

export async function getQuotationsByGuarantor(guarantorId: string): Promise<QuotationRecord[]> {
    const q = query(collection(db, COL), where('GuarantorId', '==', guarantorId), orderBy('CreatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs
        .map((d) => mapTimestamps(d.data(), d.id))
        .filter((q) => q.IsDeleted !== true);
}

export async function getQuotationById(id: string): Promise<QuotationRecord | null> {
    const snap = await getDoc(doc(db, COL, id));
    if (!snap.exists()) return null;
    return mapTimestamps(snap.data(), snap.id);
}

export async function updateQuotationStatus(
    id: string,
    Status: QuotationRecord['Status']
): Promise<void> {
    await updateDoc(doc(db, COL, id), {
        Status,
        UpdatedAt: serverTimestamp(),
    });
}

export async function updateQuotation(
    id: string,
    data: Partial<Omit<QuotationRecord, 'id' | 'CreatedAt' | 'UpdatedAt'>>
): Promise<void> {
    await updateDoc(doc(db, COL, id), {
        ...data,
        UpdatedAt: serverTimestamp(),
    });
}

// Soft-delete: set IsDeleted = true
export async function deleteQuotation(id: string): Promise<void> {
    await updateDoc(doc(db, COL, id), {
        IsDeleted: true,
        UpdatedAt: serverTimestamp(),
    });
}
