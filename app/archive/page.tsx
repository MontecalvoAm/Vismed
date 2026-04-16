import ArchiveClient from '@/components/archive/ArchiveClient';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { getServerUser } from '@/lib/getServerUser';
import AccessDenied from '@/components/AccessDenied';

export const dynamic = 'force-dynamic';

export default async function ArchivePage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams;
    const serverUser = await getServerUser();

    if (!(serverUser as any)?.Permissions?.Archive?.CanView) {
        return (
            <SidebarLayout pageTitle="Archive">
                <AccessDenied moduleName="Archive" />
            </SidebarLayout>
        );
    }

    const tab = (searchParams.tab as string) || 'guarantors';

    // We no longer fetch records on the server here.
    // ArchiveClient uses useServerTable to fetch paginated data from /api/archive.
    // This significantly reduces the initial page load time and database memory usage.

    return (
        <SidebarLayout pageTitle="Archive">
            <ArchiveClient 
                initialTab={tab as any} 
                serverRecords={[]} 
                perms={(serverUser as any)?.Permissions?.Archive} 
            />
        </SidebarLayout>
    );
}
