'use client';

import ServiceManager from '@/components/manage/ServiceManager';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ServicesPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user && !user?.Permissions?.Services?.CanView) {
            router.push('/quotation');
        }
    }, [user, loading, router]);

    if (loading || !user?.Permissions?.Services?.CanView) {
        return null;
    }

    return (
        <SidebarLayout pageTitle="Services Management">
            <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
                <ServiceManager />
            </div>
        </SidebarLayout>
    );
}
