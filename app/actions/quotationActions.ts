'use server';

import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/getServerUser';
import { createAuditLog, createBulkAuditLogs } from './auditActions';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';

export async function saveQuotationAction(data: any, isEditing: boolean = false, editId: string | null = null) {
    try {
        const user = await getServerUser() as any;
        if (!user) throw new Error("Unauthorized");

        const now = new Date();

        // Separate items from main quotation data if nested
        const { Items, ...quotationData } = data;

        let resultId = editId;

        const quotationIdToSave = editId || data.QuotationID || crypto.randomUUID();
        const documentNoToSave = data.DocumentNo || quotationIdToSave.substring(0, 8);

        if (isEditing && editId) {
            // Update Quotation and Items in a single transaction
            await prisma.$transaction(async (tx) => {
                await (tx as any).t_Quotation.update({
                    where: { QuotationID: editId },
                    data: {
                        ...quotationData,
                        UpdatedBy: user.UserID,
                        UpdatedAt: now,
                    }
                });

                if (Items && Items.length > 0) {
                    await (tx as any).t_QuotationItem.deleteMany({ where: { QuotationID: editId } });
                    await (tx as any).t_QuotationItem.createMany({
                        data: Items.map((item: any) => ({
                            ItemID: item.Id?.includes('0.') ? crypto.randomUUID() : (item.Id || crypto.randomUUID()),
                            QuotationID: editId,
                            Name: item.Name,
                            Department: item.Department,
                            Price: item.Price || 0,
                            Quantity: item.Quantity || 1,
                            Used: item.Used || 0,
                            Unit: item.Unit
                        }))
                    });
                }
            });

            // Create Audit Log (non-blocking or handled after transaction)
            await createAuditLog({
                Action: 'UPDATE_QUOTATION',
                Module: 'Quotations',
                Target: editId,
                Details: `Updated Quotation Document No: ${documentNoToSave}`,
                UserID: user.UserID,
            });
        } else {
            // Create New Quotation
            const newQuotation = await (prisma as any).t_Quotation.create({
                data: {
                    ...quotationData,
                    QuotationID: quotationIdToSave,
                    DocumentNo: documentNoToSave,
                    CustomerName: data.CustomerName || 'Unknown',
                    IsDeleted: false,
                    CreatedBy: user.UserID,
                    UpdatedBy: user.UserID,
                    DepartmentID: user.DepartmentID,
                    CreatedAt: now,
                    UpdatedAt: now,
                    Items: Items && Items.length > 0 ? {
                        create: Items.map((item: any) => ({
                            ItemID: crypto.randomUUID(),
                            Name: item.Name,
                            Department: item.Department,
                            Price: item.Price || 0,
                            Quantity: item.Quantity || 1,
                            Used: item.Used || 0,
                            Unit: item.Unit
                        }))
                    } : undefined
                }
            });
            resultId = newQuotation.QuotationID;

            await createAuditLog({
                Action: 'CREATE_QUOTATION',
                Module: 'Quotations',
                Target: resultId,
                Details: `New Quotation Created for ${data.CustomerName || 'Unknown'}: ${documentNoToSave}`,
                UserID: user.UserID,
            });
        }

        revalidatePath('/reports');
        return { success: true, id: resultId };
    } catch (e: any) {
        console.error("Action error saving quotation:", e);
        return { success: false, error: e.message };
    }
}

export async function deleteQuotationAction(id: string) {
    try {
        const user = await getServerUser() as any;
        if (!user) throw new Error("Unauthorized");

        await (prisma as any).t_Quotation.update({
            where: { QuotationID: id },
            data: { IsDeleted: true, UpdatedBy: user.UserID }
        });

        await createAuditLog({
            Action: 'DELETE_QUOTATION',
            Target: id,
            Details: `Soft-deleted quotation: ${id}`,
            UserID: user.UserID
        });

        revalidatePath('/reports');
        revalidatePath('/archive');
        return { success: true };
    } catch (e: any) {
        console.error("Action error deleting quotation:", e);
        return { success: false, error: e.message };
    }
}

export async function bulkDeleteQuotationsAction(ids: string[]) {
    try {
        const user = await getServerUser() as any;
        if (!user) throw new Error("Unauthorized");

        await (prisma as any).t_Quotation.updateMany({
            where: { QuotationID: { in: ids } },
            data: { IsDeleted: true, UpdatedBy: user.UserID }
        });

        // Use new bulk audit log function for better performance
        await createBulkAuditLogs(ids.map(id => ({
            Action: 'DELETE_QUOTATION_BULK',
            Target: id,
            Details: `Bulk soft-deleted quotation: ${id}`,
            UserID: user.UserID
        })));

        revalidatePath('/reports');
        revalidatePath('/archive');
        return { success: true };
    } catch (e: any) {
        console.error("Action error bulk deleting quotations:", e);
        return { success: false, error: e.message };
    }
}

export async function updateQuotationStatusAction(id: string, newStatus: string) {
    try {
        const user = await getServerUser() as any;
        if (!user) throw new Error("Unauthorized");

        // Check if user has permission to edit reports/quotations
        if (!user.Permissions?.Reports?.CanEdit) throw new Error("Permission Denied");

        await (prisma as any).t_Quotation.update({
            where: { QuotationID: id },
            data: { 
                Status: newStatus,
                UpdatedBy: user.UserID,
                UpdatedAt: new Date()
            }
        });

        await createAuditLog({
            Action: 'UPDATE_QUOTATION_STATUS',
            Target: id,
            Details: `Updated status to: ${newStatus}`,
            UserID: user.UserID
        });

        revalidatePath('/reports');
        return { success: true };
    } catch (e: any) {
        console.error("Action error updating quotation status:", e);
        return { success: false, error: e.message };
    }
}

