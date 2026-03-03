// ============================================================
//  VisayasMed — Firestore: Services (M_Service)
//  All fields: PascalCase per backend-visayasmed skill
// ============================================================

import {
    collection, doc, getDocs, setDoc, updateDoc, serverTimestamp,
    query, where,
} from 'firebase/firestore';
import { db, generateUUIDv7 } from '@/lib/firebase';

export interface Service {
    ServiceID: string;
    DepartmentID: string;
    ServiceName: string;
    Price: number;
    Unit: string;
    Description: string;
    IsActive: boolean;
    CreatedAt?: any;
    CreatedBy?: string;
    UpdatedAt?: any;
    UpdatedBy?: string;
}

const COL = 'M_Service';

export async function getAllServices(): Promise<Service[]> {
    const q = query(collection(db, COL), where('IsActive', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ServiceID: d.id, ...d.data() } as Service));
}

export async function getServicesByDept(DepartmentID: string): Promise<Service[]> {
    const q = query(
        collection(db, COL),
        where('DepartmentID', '==', DepartmentID),
        where('IsActive', '==', true)
    );
    const snap = await getDocs(q);
    return snap.docs
        .map((d) => ({ ServiceID: d.id, ...d.data() } as Service))
        .sort((a, b) => a.ServiceName.localeCompare(b.ServiceName));
}

export async function addService(
    data: Omit<Service, 'ServiceID' | 'CreatedAt' | 'UpdatedAt'>,
    createdBy: string
): Promise<void> {
    const id = generateUUIDv7();
    const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...data,
            ServiceID: id,
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

// Soft-delete
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
