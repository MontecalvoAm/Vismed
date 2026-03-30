'use server';

import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/getServerUser';
import { createAuditLog } from '@/lib/firestore/audit';
import crypto from 'crypto';

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
            // Update Quotation
            await (prisma as any).t_Quotation.update({
                where: { QuotationID: editId },
                data: {
                    ...quotationData,
                    UpdatedBy: user.UserID,
                    UpdatedAt: now,
                }
            });

            // Recreate Items if passed
            if (Items && Items.length > 0) {
                 await (prisma as any).t_QuotationItem.deleteMany({ where: { QuotationID: editId } });
                 await (prisma as any).t_QuotationItem.createMany({
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

            // Create Audit Log using unified helper
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

            // Create Audit Log using unified helper
            await createAuditLog({
                Action: 'CREATE_QUOTATION',
                Module: 'Quotations',
                Target: resultId,
                Details: `New Quotation Created for ${data.CustomerName || 'Unknown'}: ${documentNoToSave}`,
                UserID: user.UserID,
            });
        }

        return { success: true, id: resultId };
    } catch (e: any) {
        console.error("Action error saving quotation:", e);
        return { success: false, error: e.message };
    }
}
