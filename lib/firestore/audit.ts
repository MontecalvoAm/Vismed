import { prisma } from '@/lib/prisma';

export interface AuditLogEntry {
    LogID?: string;
    Action: string;       // e.g. "UPDATE_TRACKING", "LOGIN_SUCCESS", "LOGIN_FAILED"
    Module?: string;       // e.g. "Quotation", "Auth", "Users"
    Target?: string;      // maps to Target in Prisma
    Details?: string;     // maps to Details in Prisma
    UserID?: string;
    IpAddress?: string;
    Metadata?: Record<string, unknown>; // We'll store this in Details as JSON if needed strings
    CreatedAt?: Date | string;
    RecordID?: string; // We'll use Target or LogID
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

/**
 * Create a general audit log entry (Server Side)
 */
export async function createAuditLog(entry: any): Promise<void> {
    try {
        await prisma.t_AuditLog.create({
            data: {
                LogID: entry.LogID || undefined,
                UserID: entry.UserID,
                Action: entry.Action,
                Target: entry.Target || entry.RecordID || entry.Module,
                Details: entry.Details || JSON.stringify(entry.Metadata || {}),
                IPAddress: entry.IpAddress,
            },
        });
    } catch (err) {
        console.error('Failed to create audit log:', err);
    }
}

/**
 * Get audit logs (Server Side)
 */
export async function getUsageLogs(): Promise<any[]> {
    const [logs, users] = await Promise.all([
        prisma.t_AuditLog.findMany({
            orderBy: { CreatedAt: 'desc' }
        }),
        prisma.m_User.findMany({
            select: { UserID: true, FirstName: true, LastName: true }
        })
    ]);

    const userMap: Record<string, string> = {};
    users.forEach(u => {
        userMap[u.UserID] = `${u.FirstName || ''} ${u.LastName || ''}`.trim();
    });

    return logs.map(l => ({
        id: l.LogID,
        Action: l.Action,
        RecordID: l.Target,
        Description: l.Action,
        Details: l.Details,
        UserID: l.UserID,
        UserName: l.UserID ? userMap[l.UserID] : undefined,
        IpAddress: l.IPAddress,
        CreatedAt: l.CreatedAt.toISOString(),
        Metadata: l.Details?.startsWith('{') ? JSON.parse(l.Details) : { Details: l.Details }
    }));
}

/**
 * Delete an audit log (Server Action recommended)
 */
export async function deleteAuditLog(id: string): Promise<void> {
    await prisma.t_AuditLog.delete({
        where: { LogID: id }
    });
}
