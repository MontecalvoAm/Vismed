'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function deleteAuditLogAction(id: string) {
    try {
        await (prisma as any).t_AuditLog.delete({
            where: { LogID: id }
        });
        revalidatePath('/reports/audit-logs');
        return { success: true };
    } catch (err) {
        console.error('Failed to delete audit log:', err);
        return { success: false, error: 'Failed to delete log' };
    }
}

export async function bulkDeleteAuditLogsAction(ids: string[]) {
    try {
        await (prisma as any).t_AuditLog.deleteMany({
            where: { LogID: { in: ids } }
        });
        revalidatePath('/reports/audit-logs');
        return { success: true };
    } catch (err) {
        console.error('Failed to bulk delete audit logs:', err);
        return { success: false, error: 'Failed to delete logs' };
    }
}
export async function createAuditLog(data: {
    Action: string;
    Target: string;
    Details?: string;
    UserID?: string;
}) {
    try {
        await (prisma as any).t_AuditLog.create({
            data: {
                Action: data.Action,
                Target: data.Target,
                Details: data.Details || "",
                UserID: data.UserID || null,
            }
        });
        return { success: true };
    } catch (err) {
        console.error('Failed to create audit log:', err);
        return { success: false, error: 'Failed to create log' };
    }
}

import { createAuditLog as firestoreAuditLog } from '@/lib/firestore/audit';
export async function createDetailedAuditLogAction(entry: any) {
    try {
        await firestoreAuditLog(entry);
    } catch(err) {
        console.error(err);
    }
}
