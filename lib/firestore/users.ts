// ============================================================
//  VisayasMed — Firestore: Users (M_User)
// ============================================================

import {
    collection, doc, getDoc, getDocs, updateDoc, serverTimestamp, query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface UserRecord {
    UserID: string;
    Email: string;
    FirstName: string;
    LastName: string;
    RoleID: string;
    IsActive: boolean;
    CreatedAt?: any;
    UpdatedAt?: any;
    UpdatedBy?: string;
}

const COL = 'M_User';

export async function getUserRecord(UserID: string): Promise<UserRecord | null> {
    const snap = await getDoc(doc(db, COL, UserID));
    if (!snap.exists()) return null;
    return { UserID: snap.id, ...snap.data() } as UserRecord;
}

export async function getAllUsers(): Promise<UserRecord[]> {
    const snap = await getDocs(query(collection(db, COL)));
    return snap.docs.map((d) => ({ UserID: d.id, ...d.data() } as UserRecord));
}

export async function updateUserRole(
    UserID: string,
    RoleID: string,
    updatedBy: string
): Promise<void> {
    await updateDoc(doc(db, COL, UserID), {
        RoleID,
        UpdatedAt: serverTimestamp(),
        UpdatedBy: updatedBy,
    });
}

export async function setUserActiveStatus(
    UserID: string,
    IsActive: boolean,
    updatedBy: string
): Promise<void> {
    await updateDoc(doc(db, COL, UserID), {
        IsActive,
        UpdatedAt: serverTimestamp(),
        UpdatedBy: updatedBy,
    });
}
