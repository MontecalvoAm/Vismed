// ============================================================
//  VisayasMed — Firestore: Guarantors (T_Guarantor)
//  All fields strictly PascalCase per DB schema rules
// ============================================================

import {
    collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
    serverTimestamp, query, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ── Interfaces ────────────────────────────────────────────────

export interface GuarantorRecord {
    id?: string;          // Firestore document ID (runtime only)
    Name: string;
    Description?: string;
    CreatedAt?: any;
    UpdatedAt?: any;
}

// ── Collection constant ───────────────────────────────────────

const COL = 'T_Guarantor';

// ── CRUD functions ────────────────────────────────────────────

export async function addGuarantor(
    data: Omit<GuarantorRecord, 'id' | 'CreatedAt' | 'UpdatedAt'>
): Promise<string> {
    const res = await fetch('/api/guarantors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            GuarantorName: data.Name,
            Description: data.Description || '',
            // The API handles mapping these to the M_Guarantor schema
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
    const q = query(collection(db, COL), orderBy('Name', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
        const data = d.data();
        let formattedDate: string | null = null;
        if (data.CreatedAt instanceof Timestamp) {
            formattedDate = data.CreatedAt.toDate().toISOString();
        }
        return {
            id: d.id,
            ...data,
            CreatedAt: formattedDate,
        } as GuarantorRecord;
    });
}

export async function getGuarantorById(id: string): Promise<GuarantorRecord | null> {
    const snap = await getDoc(doc(db, COL, id));
    if (!snap.exists()) return null;
    const data = snap.data();
    let formattedDate: string | null = null;
    if (data.CreatedAt instanceof Timestamp) {
        formattedDate = data.CreatedAt.toDate().toISOString();
    }
    return { id: snap.id, ...data, CreatedAt: formattedDate } as GuarantorRecord;
}

export async function updateGuarantor(
    id: string,
    data: Partial<Omit<GuarantorRecord, 'id' | 'CreatedAt' | 'UpdatedAt'>>
): Promise<void> {
    const payload: any = {};
    if (data.Name) payload.GuarantorName = data.Name;
    if (data.Description !== undefined) payload.Description = data.Description;

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
