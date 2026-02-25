'use client';

import DepartmentManager from '@/components/manage/DepartmentManager';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DepartmentsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user && !user?.Permissions?.Departments?.CanView) {
            router.push('/quotation');
        }
    }, [user, loading, router]);

    if (loading || !user?.Permissions?.Departments?.CanView) {
        return null;
    }

    return (
        <SidebarLayout pageTitle="Departments Management">
            <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
                <DepartmentManager />
            </div>
        </SidebarLayout>
    );
}
