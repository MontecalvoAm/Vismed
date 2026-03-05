// ============================================================
//  VisayasMed — Firestore: Roles (M_Role)
//  Uses client Firestore SDK — safe to call from client components
// ============================================================

import {
    collection, getDocs, query, where, orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Role {
    RoleID: string;
    RoleName: string;
    Description: string;
    IsActive: boolean;
    IsDeleted?: boolean;
    CreatedAt?: any;
    UpdatedAt?: any;
}

/** Get only active roles (for user assignment dropdowns) */
export async function getRoles(): Promise<Role[]> {
    try {
        const q = query(
            collection(db, 'M_Role'),
            where('IsActive', '==', true),
            orderBy('RoleName', 'asc')
        );
        const snap = await getDocs(q);
        return snap.docs
            .map((d) => ({ RoleID: d.id, ...d.data() } as Role))
            .filter((r) => r.IsDeleted !== true);
    } catch {
        const snap = await getDocs(
            query(collection(db, 'M_Role'), where('IsActive', '==', true))
        );
        return snap.docs
            .map((d) => ({ RoleID: d.id, ...d.data() } as Role))
            .filter((r) => r.IsDeleted !== true);
    }
}

/** Get ALL active roles (for admin management table) */
export async function getAllRoles(): Promise<Role[]> {
    try {
        const snap = await getDocs(
            query(collection(db, 'M_Role'), orderBy('RoleName', 'asc'))
        );
        return snap.docs
            .map((d) => ({ RoleID: d.id, ...d.data() } as Role))
            .filter((r) => r.IsDeleted !== true);
    } catch {
        const snap = await getDocs(collection(db, 'M_Role'));
        return snap.docs
            .map((d) => ({ RoleID: d.id, ...d.data() } as Role))
            .filter((r) => r.IsDeleted !== true);
    }
}

/** Get archived (soft-deleted) roles */
export async function getArchivedRoles(): Promise<Role[]> {
    const snap = await getDocs(collection(db, 'M_Role'));
    return snap.docs
        .map((d) => ({ RoleID: d.id, ...d.data() } as Role))
        .filter((r) => r.IsDeleted === true)
        .sort((a, b) => a.RoleName.localeCompare(b.RoleName));
}
