import { getServerUser } from '@/lib/getServerUser';
import QuotationClient from './QuotationClient';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export default async function QuotationPage() {
    await getServerUser();

    // Fetch initial data on the server
    const [dSnap, sSnap, gSnap] = await Promise.all([
        adminDb.collection('M_Department').where('IsActive', '==', true).get(),
        adminDb.collection('M_Service').where('IsActive', '==', true).get(),
        adminDb.collection('T_Guarantor').where('IsDeleted', '!=', true).get(), // Using IsDeleted != true for active guarantors
    ]);

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
        <QuotationClient
            initialDepartments={initialDepartments}
            initialServices={initialServices}
            initialGuarantors={initialGuarantors}
        />
    );
}
