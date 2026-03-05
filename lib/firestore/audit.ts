// ============================================================
//  VisayasMed — Firestore: Audit Logs (MT_AuditLog)
//  Logs tracking changes, entity updates, and security events
// ============================================================

import {
    collection, doc, setDoc, getDocs, query, where, orderBy,
    serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface AuditLogEntry {
    Action: string;       // e.g. "UPDATE_TRACKING", "LOGIN_SUCCESS", "LOGIN_FAILED"
    Module: string;       // e.g. "Quotation", "Auth", "Users"
    RecordID: string;
    Description: string;
    OldValues?: unknown;
    NewValues?: unknown;
    UserID?: string;
    // Security event fields
    IpAddress?: string;
    UserAgent?: string;
    Severity?: 'info' | 'warning' | 'critical';
    Metadata?: Record<string, unknown>;
    CreatedAt?: unknown;
}

// Security event types
export const SECURITY_EVENTS = {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILED: 'LOGIN_FAILED',
    LOGOUT: 'LOGOUT',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

const COL = 'MT_AuditLog';

/**
 * Create a general audit log entry
 */
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

/**
 * Log a security event (for server-side use)
 * Includes IP address and user agent for security tracking
 */
export async function logSecurityEvent(params: {
    action: string;
    userId?: string;
    description: string;
    ipAddress?: string;
    userAgent?: string;
    severity?: 'info' | 'warning' | 'critical';
    metadata?: Record<string, unknown>;
}): Promise<void> {
    try {
        const newDocRef = doc(collection(db, COL));
        await setDoc(newDocRef, {
            Action: params.action,
            Module: 'Security',
            RecordID: params.userId ?? 'anonymous',
            Description: params.description,
            UserID: params.userId,
            IpAddress: params.ipAddress,
            UserAgent: params.userAgent,
            Severity: params.severity ?? 'info',
            Metadata: params.metadata,
            CreatedAt: serverTimestamp(),
        });
    } catch (err) {
        console.error('Failed to log security event:', err);
    }
}

/**
 * Get audit logs for a specific record
 */
export async function getAuditLogsForRecord(recordId: string): Promise<AuditLogEntry[]> {
    const q = query(
        collection(db, COL),
        where('RecordID', '==', recordId),
        orderBy('CreatedAt', 'desc')   // sorted server-side — requires composite index
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => {
        const data = d.data();
        return {
            ...data,
            CreatedAt: data.CreatedAt instanceof Timestamp ? data.CreatedAt.toDate().toISOString() : null,
        } as AuditLogEntry;
    });
}

/**
 * Get security logs (admin function)
 */
export async function getSecurityLogs(options?: {
    userId?: string;
    action?: string;
    limit?: number;
}): Promise<AuditLogEntry[]> {
    let q = query(
        collection(db, COL),
        where('Module', '==', 'Security'),
        orderBy('CreatedAt', 'desc')   // sorted server-side — requires composite index
    );

    if (options?.userId) {
        q = query(q, where('UserID', '==', options.userId));
    }
    if (options?.action) {
        q = query(q, where('Action', '==', options.action));
    }

    const snap = await getDocs(q);
    let logs = snap.docs.map(d => {
        const data = d.data();
        return {
            ...data,
            CreatedAt: data.CreatedAt instanceof Timestamp ? data.CreatedAt.toDate().toISOString() : null,
        } as AuditLogEntry;
    });

    if (options?.limit && logs.length > options.limit) {
        logs = logs.slice(0, options.limit);
    }

    return logs;
}

/**
 * Get usage logs (All CRUD Actions for Quotations)
 */
export async function getUsageLogs(): Promise<(AuditLogEntry & { id: string })[]> {
    const q = query(
        collection(db, COL),
        where('Module', '==', 'Quotation'),
        orderBy('CreatedAt', 'desc')   // sorted server-side — requires composite index
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            ...data,
            CreatedAt: data.CreatedAt instanceof Timestamp ? data.CreatedAt.toDate().toISOString() : null,
        } as AuditLogEntry & { id: string };
    });
}

/**
 * Delete an audit log
 */
export async function deleteAuditLog(id: string): Promise<void> {
    const { deleteDoc, doc } = await import('firebase/firestore');
    await deleteDoc(doc(db, COL, id));
}
