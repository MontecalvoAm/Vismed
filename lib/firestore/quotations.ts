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
    Status: string; // Dynamic status; typical defaults: 'Incomplete', 'Completed', 'Waiting for Approval'
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

// ── CRUD functions ────────────────────────────────────────────

export async function addQuotation(
    data: Omit<QuotationRecord, 'id' | 'CreatedAt' | 'UpdatedAt'>
): Promise<string> {
    const newDocRef = doc(collection(db, COL));
    await setDoc(newDocRef, {
        ...data,
        CreatedAt: serverTimestamp(),
        UpdatedAt: serverTimestamp(),
    });
    return newDocRef.id;
}

export async function getQuotations(): Promise<QuotationRecord[]> {
    const q = query(collection(db, COL), orderBy('CreatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
        const data = d.data();
        let formattedDate: string | null = null;
        if (data.CreatedAt instanceof Timestamp) {
            formattedDate = data.CreatedAt.toDate().toISOString();
        }
        let formattedUpdatedDate: string | null = null;
        if (data.UpdatedAt instanceof Timestamp) {
            formattedUpdatedDate = data.UpdatedAt.toDate().toISOString();
        }
        return {
            id: d.id,
            ...data,
            CreatedAt: formattedDate,
            UpdatedAt: formattedUpdatedDate,
        } as QuotationRecord;
    });
}

export async function getQuotationsByGuarantor(guarantorId: string): Promise<QuotationRecord[]> {
    const q = query(collection(db, COL), where('GuarantorId', '==', guarantorId), orderBy('CreatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
        const data = d.data();
        let formattedDate: string | null = null;
        if (data.CreatedAt instanceof Timestamp) {
            formattedDate = data.CreatedAt.toDate().toISOString();
        }
        let formattedUpdatedDate: string | null = null;
        if (data.UpdatedAt instanceof Timestamp) {
            formattedUpdatedDate = data.UpdatedAt.toDate().toISOString();
        }
        return {
            id: d.id,
            ...data,
            CreatedAt: formattedDate,
            UpdatedAt: formattedUpdatedDate,
        } as QuotationRecord;
    });
}

export async function getQuotationById(id: string): Promise<QuotationRecord | null> {
    const snap = await getDoc(doc(db, COL, id));
    if (!snap.exists()) return null;
    const data = snap.data();
    let formattedDate: string | null = null;
    if (data.CreatedAt instanceof Timestamp) {
        formattedDate = data.CreatedAt.toDate().toISOString();
    }
    let formattedUpdatedDate: string | null = null;
    if (data.UpdatedAt instanceof Timestamp) {
        formattedUpdatedDate = data.UpdatedAt.toDate().toISOString();
    }
    return { id: snap.id, ...data, CreatedAt: formattedDate, UpdatedAt: formattedUpdatedDate } as QuotationRecord;
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

export async function deleteQuotation(id: string): Promise<void> {
    await deleteDoc(doc(db, COL, id));
}
