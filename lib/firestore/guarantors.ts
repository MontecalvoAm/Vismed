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
    const newDocRef = doc(collection(db, COL));
    await setDoc(newDocRef, {
        ...data,
        CreatedAt: serverTimestamp(),
        UpdatedAt: serverTimestamp(),
    });
    return newDocRef.id;
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
    await updateDoc(doc(db, COL, id), {
        ...data,
        UpdatedAt: serverTimestamp(),
    });
}

export async function deleteGuarantor(id: string): Promise<void> {
    await deleteDoc(doc(db, COL, id));
}
