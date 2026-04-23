'use server';

import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/getServerUser';
import { createAuditLog } from '@/app/actions/auditActions';

export async function addGuarantorAction(data: { Name: string, Description?: string }) {
    try {
        const user = await getServerUser() as any;
        if (!user) throw new Error("Unauthorized");
        if (!user.Permissions?.Setup?.CanEdit) throw new Error("Permission Denied");

        const normalizedName = data.Name.toUpperCase();

        const guarantor = await prisma.t_Guarantor.create({
            data: {
                Name: normalizedName,
                Description: data.Description || "",
                IsDeleted: false,
            }
        });

        await createAuditLog({
            Action: 'Created Guarantor',
            Target: 'Setup',
            Details: `Added Guarantor: ${normalizedName} (ID: ${guarantor.GuarantorID})`,
            UserID: user.UserID
        });

        return { success: true, id: guarantor.GuarantorID, name: normalizedName };
    } catch (e: any) {
        console.error("Action error adding guarantor:", e);
        return { success: false, error: e.message };
    }
}
