// ============================================================
//  VisayasMed — Firestore: Roles (M_Role)
// ============================================================

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Role {
    RoleID: string;
    RoleName: string;
    Description: string;
    IsActive: boolean;
}

export async function getRoles(): Promise<Role[]> {
    const q = query(collection(db, 'M_Role'), where('IsActive', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ RoleID: d.id, ...d.data() } as Role));
}
