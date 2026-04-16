'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { deleteQuotationAction, bulkDeleteQuotationsAction } from '@/app/actions/quotationActions';
import ReportsFilter from '@/components/reports/ReportsFilter';
import ReportsTable from '@/components/reports/ReportsTable';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { History, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { FeedbackModal } from '@/components/ui/FeedbackModal';

interface ReportsPageViewProps {
    paginatedQuotations: QuotationRecord[];
    totalQuotationsCount: number;
    completeQuotationsCount: number;
    incompleteQuotationsCount: number;
    waitingQuotationsCount: number;
    filteredQuotationsCount: number;
    totalPages: number;
    guarantors: GuarantorRecord[];
    dynamicStatuses: string[];
}

export default function ReportsPageView({
    paginatedQuotations,
    totalQuotationsCount,
    completeQuotationsCount,
    incompleteQuotationsCount,
    waitingQuotationsCount,
    filteredQuotationsCount,
    totalPages,
    guarantors,
    dynamicStatuses
}: ReportsPageViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const searchTerm = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || 'all';
    const dateFrom = searchParams.get('from') || '';
    const dateTo = searchParams.get('to') || '';
    const guarantorFilter = searchParams.get('guarantor') || 'all';
    const currentPage = parseInt(searchParams.get('page') || '1', 10);
    const rowsPerPage = parseInt(searchParams.get('limit') || '10', 10);

    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
        isOpen: false, type: 'success', title: '', message: ''
    });

    const updateQuery = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, val]) => {
            if (val === null || val === '') params.delete(key);
            else params.set(key, val);
        });
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const handleDeleteQuotation = async (id: string) => {
        try {
            const res = await deleteQuotationAction(id);
            if (!res.success) throw new Error(res.error);
            router.refresh();
            setFeedback({ isOpen: true, type: 'success', title: 'Deleted', message: 'Quotation successfully deleted.' });
        } catch (err: any) {
            console.error('Error deleting:', err);
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: err.message || 'Failed to delete quotation.' });
        }
    };

    const handleBulkDeleteQuotation = async (ids: string[]) => {
        try {
            const res = await bulkDeleteQuotationsAction(ids);
            if (!res.success) throw new Error(res.error);
            router.refresh();
            setFeedback({ isOpen: true, type: 'success', title: 'Deleted', message: 'Selected quotations successfully deleted.' });
        } catch (err: any) {
            console.error('Error bulk deleting:', err);
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: err.message || 'Failed to delete some or all selected quotations.' });
        }
    };

    const stats = [
        { label: 'Total Quotations', value: filteredQuotationsCount, icon: <FileText className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600', format: (v: number) => v.toString(), },
        { label: 'Complete Quotations', value: completeQuotationsCount, icon: <CheckCircle className="w-5 h-5" />, color: 'bg-green-50 text-green-600', format: (v: number) => v.toString(), },
        { label: 'Incomplete Quotations', value: incompleteQuotationsCount, icon: <AlertCircle className="w-5 h-5" />, color: 'bg-rose-50 text-rose-600', format: (v: number) => v.toString(), },
        { label: 'Waiting for Approval', value: waitingQuotationsCount, icon: <Clock className="w-5 h-5" />, color: 'bg-amber-50 text-amber-600', format: (v: number) => v.toString(), },
    ];

    return (
        <SidebarLayout pageTitle="Quotation Records">
            <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Quotation Records</h1>
                            <p className="text-gray-500 mt-0.5">Track all past quotations, sessions, and client activity.</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {stats.map((stat) => (
                        <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${stat.color}`}>
                                {stat.icon}
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                                <p className="text-xl font-bold text-gray-900 mt-0.5">
                                    {loading ? '—' : stat.format(stat.value)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <ReportsFilter
                    searchTerm={searchTerm}
                    onSearchChange={(val) => updateQuery({ search: val || null, page: '1' })}
                    statusFilter={statusFilter}
                    onStatusChange={(val) => updateQuery({ status: val === 'all' ? null : val, page: '1' })}
                    guarantorFilter={guarantorFilter}
                    onGuarantorChange={(val) => updateQuery({ guarantor: val === 'all' ? null : val, page: '1' })}
                    availableGuarantors={guarantors.map(g => ({ id: g.id!, Name: g.Name }))}
                    dateFrom={dateFrom}
                    onDateFromChange={(val) => updateQuery({ from: val || null, page: '1' })}
                    dateTo={dateTo}
                    onDateToChange={(val) => updateQuery({ to: val || null, page: '1' })}
                    availableStatuses={dynamicStatuses}
                />

                <ReportsTable
                    data={paginatedQuotations}
                    isLoading={loading}
                    onRefresh={() => router.refresh()}
                    onDelete={handleDeleteQuotation}
                    onBulkDelete={handleBulkDeleteQuotation}
                    currentPage={currentPage}
                    rowsPerPage={rowsPerPage}
                    totalPages={totalPages}
                    totalCount={filteredQuotationsCount}
                    updateQuery={updateQuery}
                />
            </div>

            <FeedbackModal
                isOpen={feedback.isOpen}
                type={feedback.type}
                title={feedback.title}
                message={feedback.message}
                onClose={() => setFeedback(f => ({ ...f, isOpen: false }))}
            />
        </SidebarLayout>
    );
}
