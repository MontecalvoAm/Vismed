import ArchiveClient from '@/components/archive/ArchiveClient';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { getServerUser } from '@/lib/getServerUser';
import { adminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

function parseTimestamp(val: any): string | null {
    if (!val) return null;
    if (val instanceof admin.firestore.Timestamp) return val.toDate().toISOString();
    if (typeof val === 'string') return val;
    return null;
}

function mapDoc(d: admin.firestore.QueryDocumentSnapshot): Record<string, any> {
    const data = d.data();
    return {
        id: d.id,
        ...data,
        CreatedAt: parseTimestamp(data.CreatedAt),
        UpdatedAt: parseTimestamp(data.UpdatedAt),
        DeletedAt: parseTimestamp(data.DeletedAt),
    };
}

export default async function ArchivePage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams;
    const serverUser = await getServerUser();

    if (!(serverUser as any)?.Permissions?.Archive?.CanView) {
        return (
            <SidebarLayout pageTitle="Archive">
                <div className="p-8 text-center text-red-500 font-medium">
                    Access Denied: You do not have permission to view the Archive module.
                </div>
            </SidebarLayout>
        );
    }

    const tab = (searchParams.tab as string) || 'guarantors';

    let records: Record<string, any>[] = [];
    switch (tab) {
        case 'guarantors': {
            const snap = await adminDb.collection('T_Guarantor').where('IsDeleted', '==', true).get();
            records = snap.docs.map(mapDoc);
            break;
        }
        case 'quotations': {
            const snap = await adminDb.collection('T_Quotation').where('IsDeleted', '==', true).get();
            records = snap.docs.map(mapDoc);
            break;
        }
        case 'departments': {
            const snap = await adminDb.collection('M_Department').where('IsDeleted', '==', true).get();
            records = snap.docs.map(mapDoc);
            break;
        }
        case 'services': {
            const snap = await adminDb.collection('M_Service').where('IsDeleted', '==', true).get();
            records = snap.docs.map(mapDoc);
            break;
        }
        case 'users': {
            const snap = await adminDb.collection('M_User').where('IsDeleted', '==', true).get();
            records = snap.docs.map((d) => {
                const data = d.data();
                const { Password, ...safe } = data;
                return {
                    id: d.id,
                    ...safe,
                    CreatedAt: parseTimestamp(data.CreatedAt),
                    UpdatedAt: parseTimestamp(data.UpdatedAt),
                };
            });
            break;
        }
        case 'logs': {
            const snap = await adminDb.collection('MT_AuditLog').orderBy('CreatedAt', 'desc').limit(200).get();
            records = snap.docs.map(mapDoc);
            break;
        }
    }

    return (
        <SidebarLayout pageTitle="Archive">
            <ArchiveClient initialTab={tab as any} serverRecords={records} perms={(serverUser as any)?.Permissions?.Archive} />
        </SidebarLayout>
    );
}
