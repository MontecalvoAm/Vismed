// ============================================================
//  VisayasMed — Firestore: Audit Logs (MT_AuditLog)
//  Logs tracking changes and entity updates per instructions.
// ============================================================

import {
    collection, doc, setDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface AuditLogEntry {
    Action: string;       // e.g. "UPDATE_TRACKING"
    Module: string;       // e.g. "Quotation"
    RecordID: string;
    Description: string;
    OldValues?: any;
    NewValues?: any;
    UserID?: string;      // Optional since client side logic doesn't strictly have ID readily available locally right now
}

const COL = 'MT_AuditLog';

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
        const newDocRef = doc(collection(db, COL));
        await setDoc(newDocRef, {
            ...entry,
            CreatedAt: serverTimestamp(),
        });
    } catch (err) {
        console.error('Failed to create audit log:', err);
        // Fail silently for audit logs to not block the main transaction
    }
}
