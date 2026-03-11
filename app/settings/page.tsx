import SidebarLayout from '@/components/layout/SidebarLayout';
import SettingsClient from '@/components/settings/SettingsClient';
import { getServerUser } from '@/lib/getServerUser';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const serverUser = await getServerUser();

    if (!serverUser) {
        return null;
    }

    return (
        <SidebarLayout pageTitle="Settings">
            <SettingsClient serverUser={serverUser} />
        </SidebarLayout>
    );
}
