'use server';

import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/getServerUser';
import { createAuditLog } from '@/app/actions/auditActions';

export async function addGuarantorAction(data: { Name: string, Description?: string }) {
    try {
        const user = await getServerUser() as any;
        if (!user) throw new Error("Unauthorized");
        if (!user.Permissions?.Setup?.CanEdit) throw new Error("Permission Denied");

        const guarantor = await prisma.t_Guarantor.create({
            data: {
                Name: data.Name,
                Description: data.Description || "",
                IsDeleted: false,
            }
        });

        await createAuditLog({
            Action: 'Created Guarantor',
            Target: 'Setup',
            Details: `Added Guarantor: ${data.Name} (ID: ${guarantor.GuarantorID})`,
            UserID: user.UserID
        });

        return { success: true, id: guarantor.GuarantorID, name: data.Name };
    } catch (e: any) {
        console.error("Action error adding guarantor:", e);
        return { success: false, error: e.message };
    }
}
