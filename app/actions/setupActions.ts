'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import { getServerUser } from '@/lib/getServerUser';
import * as admin from 'firebase-admin';

export async function addGuarantorAction(data: { Name: string, Description?: string }) {
    try {
        const user = await getServerUser() as any;
        if (!user) throw new Error("Unauthorized");
        if (!user.Permissions?.Setup?.CanEdit) throw new Error("Permission Denied");

        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        const record = {
            Name: data.Name,
            Description: data.Description || "",
            IsDeleted: false,
            CreatedAt: timestamp,
            UpdatedAt: timestamp,
        };

        const newDocRef = await adminDb.collection('T_Guarantor').add(record);

        await adminDb.collection('MT_AuditLog').add({
            Action: 'Created Guarantor',
            Module: 'Setup',
            RecordID: newDocRef.id,
            Description: `Added Guarantor: ${data.Name}`,
            UserName: `${user.FirstName} ${user.LastName}`,
            Email: user.Email,
            CreatedAt: timestamp,
        });

        return { success: true, id: newDocRef.id, name: data.Name };
    } catch (e: any) {
        console.error("Action error adding guarantor:", e);
        return { success: false, error: e.message };
    }
}
