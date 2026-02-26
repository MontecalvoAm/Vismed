// ============================================================
//  VisayasMed — Firestore: Departments (M_Department)
//  All fields: PascalCase per backend-visayasmed skill
// ============================================================

import {
    collection, doc, getDocs, setDoc, updateDoc, serverTimestamp,
    query, where,
} from 'firebase/firestore';
import { db, generateUUIDv7 } from '@/lib/firebase';

export interface Department {
    DepartmentID: string;
    DepartmentName: string;
    Icon?: string;
    Description: string;
    SortOrder: number;
    IsActive: boolean;
    CreatedAt?: any;
    CreatedBy?: string;
    UpdatedAt?: any;
    UpdatedBy?: string;
}

const COL = 'M_Department';

export async function getDepartments(): Promise<Department[]> {
    const q = query(
        collection(db, COL),
        where('IsActive', '==', true)
    );
    const snap = await getDocs(q);
    return snap.docs
        .map((d) => ({ DepartmentID: d.id, ...d.data() } as Department))
        .sort((a, b) => (a.SortOrder ?? 0) - (b.SortOrder ?? 0));
}

export async function addDepartment(
    data: Omit<Department, 'DepartmentID' | 'CreatedAt' | 'UpdatedAt'>,
    createdBy: string
): Promise<string> {
    const id = generateUUIDv7();
    await setDoc(doc(db, COL, id), {
        ...data,
        DepartmentID: id,
        IsActive: true,
        CreatedAt: serverTimestamp(),
        CreatedBy: createdBy,
        UpdatedAt: serverTimestamp(),
        UpdatedBy: createdBy,
    });
    return id;
}

export async function updateDepartment(
    DepartmentID: string,
    data: Partial<Department>,
    updatedBy: string
): Promise<void> {
    await updateDoc(doc(db, COL, DepartmentID), {
        ...data,
        UpdatedAt: serverTimestamp(),
        UpdatedBy: updatedBy,
    });
}

// Soft-delete: set IsActive = false
export async function deleteDepartment(DepartmentID: string, updatedBy: string): Promise<void> {
    await updateDoc(doc(db, COL, DepartmentID), {
        IsActive: false,
        UpdatedAt: serverTimestamp(),
        UpdatedBy: updatedBy,
    });
}
