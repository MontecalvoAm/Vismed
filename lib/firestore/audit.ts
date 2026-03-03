// ============================================================
//  VisayasMed — Firestore: Audit Logs (MT_AuditLog)
//  Logs tracking changes and entity updates per instructions.
// ============================================================

import {
    collection, doc, setDoc, getDocs, query, where, orderBy,
    serverTimestamp, Timestamp
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
    CreatedAt?: any;
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

export async function getAuditLogsForRecord(recordId: string): Promise<AuditLogEntry[]> {
    const q = query(
        collection(db, COL),
        where('RecordID', '==', recordId)
    );
    const snap = await getDocs(q);
    const logs = snap.docs.map(d => {
        const data = d.data();
        return {
            ...data,
            CreatedAt: data.CreatedAt instanceof Timestamp ? data.CreatedAt.toDate().toISOString() : null,
        } as AuditLogEntry;
    });
    // Sort client-side if missing index
    logs.sort((a, b) => {
        if (!a.CreatedAt) return 1;
        if (!b.CreatedAt) return -1;
        return new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime();
    });
    return logs;
}
