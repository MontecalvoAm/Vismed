import { getServerUser } from '@/lib/getServerUser';
import { adminDb } from '@/lib/firebaseAdmin';
import { redirect } from 'next/navigation';
import EditQuotationClient from './EditQuotationClient';

export const dynamic = 'force-dynamic';

export default async function EditQuotationPage({ params }: { params: { id: string } }) {
    await getServerUser();

    // Fetch initial data on the server
    const [dSnap, sSnap, gSnap, qDoc] = await Promise.all([
        adminDb.collection('M_Department').where('IsActive', '==', true).get(),
        adminDb.collection('M_Service').where('IsActive', '==', true).get(),
        adminDb.collection('T_Guarantor').where('IsDeleted', '!=', true).get(), // Using IsDeleted != true for active guarantors
        adminDb.collection('T_Quotation').doc(params.id).get()
    ]);

    if (!qDoc.exists) {
        redirect('/reports');
    }

    const quotation = {
        id: qDoc.id,
        ...qDoc.data(),
        CreatedAt: qDoc.data()?.CreatedAt?.toDate?.()?.toISOString() || null,
        UpdatedAt: qDoc.data()?.UpdatedAt?.toDate?.()?.toISOString() || null,
    };

    const initialDepartments = dSnap.docs.map(d => ({
        DepartmentID: d.id,
        ...d.data(),
        CreatedAt: d.data().CreatedAt?.toDate?.()?.toISOString() || null,
        UpdatedAt: d.data().UpdatedAt?.toDate?.()?.toISOString() || null,
    }));

    const initialServices = sSnap.docs.map(d => ({
        ServiceID: d.id,
        ...d.data(),
        CreatedAt: d.data().CreatedAt?.toDate?.()?.toISOString() || null,
        UpdatedAt: d.data().UpdatedAt?.toDate?.()?.toISOString() || null,
    }));

    const initialGuarantors = gSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        CreatedAt: d.data().CreatedAt?.toDate?.()?.toISOString() || null,
        UpdatedAt: d.data().UpdatedAt?.toDate?.()?.toISOString() || null,
    }));

    return (
        <EditQuotationClient
            initialQuotation={quotation}
            initialDepartments={initialDepartments}
            initialServices={initialServices}
            initialGuarantors={initialGuarantors}
            id={params.id}
        />
    );
}
