'use server';

import { prisma } from '@/lib/prisma';
import { SECURITY_EVENTS } from '@/lib/constants/audit';


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



/**
 * Create a general audit log entry (Server Side)
 */
export async function createAuditLog(entry: any): Promise<void> {
    try {
        // Store the entire entry as JSON in Details so we don't lose structured data
        // while maintaining compatibility with the existing schema
        const auditData = {
            Action: entry.Action,
            Module: entry.Module,
            Description: entry.Description,
            OldValues: entry.OldValues,
            NewValues: entry.NewValues,
            Metadata: entry.Metadata,
            UserID: entry.UserID,
            IpAddress: entry.IpAddress
        };

        await (prisma as any).t_AuditLog.create({
            data: {
                LogID: entry.LogID || undefined,
                UserID: entry.UserID,
                Action: entry.Action,
                Target: entry.Target || entry.RecordID || entry.Module,
                Details: JSON.stringify(auditData),
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
        (prisma as any).t_AuditLog.findMany({
            orderBy: { CreatedAt: 'desc' }
        }),
        (prisma as any).m_User.findMany({
            select: { UserID: true, FirstName: true, LastName: true }
        })
    ]);

    const userMap: Record<string, string> = {};
    users.forEach(u => {
        userMap[u.UserID] = `${u.FirstName || ''} ${u.LastName || ''}`.trim();
    });

    return logs.map(l => {
        let structuredDetails: any = {};
        try {
            if (l.Details?.startsWith('{')) {
                structuredDetails = JSON.parse(l.Details);
            } else {
                structuredDetails = { Description: l.Details || l.Action };
            }
        } catch (e) {
            structuredDetails = { Description: l.Details || l.Action };
        }

        return {
            id: l.LogID,
            Action: l.Action,
            RecordID: l.Target,
            Description: structuredDetails.Description || l.Action,
            Details: l.Details,
            UserID: l.UserID,
            UserName: l.UserID ? userMap[l.UserID] : undefined,
            IpAddress: l.IPAddress,
            CreatedAt: l.CreatedAt.toISOString(),
            Metadata: structuredDetails.Metadata || {},
            OldValues: structuredDetails.OldValues,
            NewValues: structuredDetails.NewValues,
            Module: structuredDetails.Module
        };
    });
}

/**
 * Delete an audit log (Server Action recommended)
 */
export async function deleteAuditLog(id: string): Promise<void> {
    await (prisma as any).t_AuditLog.delete({
        where: { LogID: id }
    });
}
