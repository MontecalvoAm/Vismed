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
    IsDeleted?: boolean;
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
        .filter((d) => d.IsDeleted !== true)
        .sort((a, b) => (a.SortOrder ?? 0) - (b.SortOrder ?? 0));
}

export async function getArchivedDepartments(): Promise<Department[]> {
    const snap = await getDocs(collection(db, COL));
    return snap.docs
        .map((d) => ({ DepartmentID: d.id, ...d.data() } as Department))
        .filter((d) => d.IsDeleted === true)
        .sort((a, b) => a.DepartmentName.localeCompare(b.DepartmentName));
}

export async function addDepartment(
    data: Omit<Department, 'DepartmentID' | 'CreatedAt' | 'UpdatedAt'>,
    createdBy: string
): Promise<string> {
    const id = generateUUIDv7();
    const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...data,
            DepartmentID: id,
            CreatedBy: createdBy
        })
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add department');
    }

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

// Soft-delete: set IsDeleted = true
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

