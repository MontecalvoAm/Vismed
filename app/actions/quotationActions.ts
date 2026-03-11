'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import { getServerUser } from '@/lib/getServerUser';
import * as admin from 'firebase-admin';

const COL_QUOTATION = 'T_Quotation';

export async function saveQuotationAction(data: any, isEditing: boolean = false, editId: string | null = null) {
    try {
        const user = await getServerUser() as any;
        if (!user) throw new Error("Unauthorized");

        const timestamp = admin.firestore.FieldValue.serverTimestamp();

        // Ensure data formatting
        const record = {
            ...data,
            UpdatedAt: timestamp,
        };

        let newId = editId;

        if (isEditing && editId) {
            await adminDb.collection(COL_QUOTATION).doc(editId).update(record);

            // Create Audit Log
            await adminDb.collection('MT_AuditLog').add({
                Action: 'Edited Quotation',
                Module: 'Quotation',
                RecordID: editId,
                Description: `Updated Quotation Document No: ${data.DocumentNo || editId}`,
                UserName: `${user.FirstName} ${user.LastName}`,
                Email: user.Email,
                CreatedAt: timestamp,
            });
        } else {
            record.CreatedAt = timestamp;
            record.IsDeleted = false;

            const newDocRef = await adminDb.collection(COL_QUOTATION).add(record);
            newId = newDocRef.id;

            // Create Audit Log
            await adminDb.collection('MT_AuditLog').add({
                Action: 'Created Quotation',
                Module: 'Quotation',
                RecordID: newId,
                Description: `Created Quotation Document No: ${data.DocumentNo || newId}`,
                Metadata: {
                    PatientName: data.CustomerName,
                    GuarantorName: data.GuarantorName ?? '',
                },
                UserName: `${user.FirstName} ${user.LastName}`,
                Email: user.Email,
                CreatedAt: timestamp,
            });
        }

        return { success: true, id: newId };
    } catch (e: any) {
        console.error("Action error saving quotation:", e);
        return { success: false, error: e.message };
    }
}
