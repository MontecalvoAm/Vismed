'use client';

import { useState, useEffect, useMemo } from 'react';
import { QuotationRecord, getQuotations, computeTotalQuantity, deleteQuotation } from '@/lib/firestore/quotations';
import { getGuarantors, GuarantorRecord } from '@/lib/firestore/guarantors';
import { createAuditLog } from '@/lib/firestore/audit';
import { useConfirm } from '@/context/ConfirmContext';
import ReportsFilter from '@/components/reports/ReportsFilter';
import ReportsTable from '@/components/reports/ReportsTable';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { History, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { FeedbackModal } from '@/components/ui/FeedbackModal';

export default function ReportsPage() {
    const { alert } = useConfirm();
    const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    });

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [guarantorFilter, setGuarantorFilter] = useState('all');
    const [guarantors, setGuarantors] = useState<GuarantorRecord[]>([]);

    const load = async () => {
        setLoading(true);
        try {
            const data = await getQuotations();
            setQuotations(data);
        } catch (err) {
            console.error('Error fetching history:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadGuarantors = async () => {
        try {
            const data = await getGuarantors();
            setGuarantors(data);
        } catch (err) {
            console.error('Error fetching guarantors:', err);
        }
    };

    const handleDeleteQuotation = async (id: string) => {
        try {
            const qToDel = quotations.find(q => q.id === id);
            await deleteQuotation(id);
            if (qToDel) {
                await createAuditLog({
                    Action: 'Deleted Quotation',
                    Module: 'History',
                    RecordID: id,
                    Description: `Deleted Quotation No: ${qToDel.DocumentNo || qToDel.id}`
                });
            }
            load();
            setFeedback({ isOpen: true, type: 'success', title: 'Deleted', message: 'Quotation successfully deleted.' });
        } catch (err) {
            console.error('Error deleting:', err);
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to delete quotation.' });
        }
    };

    const handleBulkDeleteQuotation = async (ids: string[]) => {
        try {
            await Promise.all(ids.map(async (id) => {
                const qToDel = quotations.find(q => q.id === id);
                await deleteQuotation(id);
                if (qToDel) {
                    await createAuditLog({
                        Action: 'Deleted Quotation (Bulk)',
                        Module: 'History',
                        RecordID: id,
                        Description: `Deleted Quotation No: ${qToDel.DocumentNo || qToDel.id}`
                    });
                }
            }));
            load();
            setFeedback({ isOpen: true, type: 'success', title: 'Deleted', message: 'Selected quotations successfully deleted.' });
        } catch (err) {
            console.error('Error bulk deleting:', err);
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to delete some or all selected quotations.' });
        }
    };

    // Calculate dynamic statuses
    const dynamicStatuses = useMemo(() => {
        const s = new Set<string>();
        quotations.forEach(q => {
            if (q.Status) s.add(q.Status);
        });
        return Array.from(s).sort();
    }, [quotations]);

    useEffect(() => {
        load();
        loadGuarantors();
    }, []);

    const filteredData = useMemo(() => {
        let result = quotations;

        if (searchTerm) {
            const qStr = searchTerm.toLowerCase();
            result = result.filter(
                (r) =>
                    (r.CustomerFirstName ?? '').toLowerCase().includes(qStr) ||
                    (r.CustomerLastName ?? '').toLowerCase().includes(qStr) ||
                    (r.CustomerName ?? '').toLowerCase().includes(qStr) ||
                    (r.CustomerEmail ?? '').toLowerCase().includes(qStr) ||
                    (r.DocumentNo ?? '').toLowerCase().includes(qStr) ||
                    (r.GuarantorName ?? '').toLowerCase().includes(qStr) ||
                    (r.Items ?? []).some(item => (item.Name ?? '').toLowerCase().includes(qStr))
            );
        }

        if (statusFilter !== 'all') {
            result = result.filter((r) => r.Status === statusFilter);
        }

        if (dateFrom) {
            const from = new Date(dateFrom);
            result = result.filter((r) => r.CreatedAt && new Date(r.CreatedAt) >= from);
        }

        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            result = result.filter((r) => r.CreatedAt && new Date(r.CreatedAt) <= to);
        }

        if (guarantorFilter !== 'all') {
            result = result.filter((r) => r.GuarantorName === guarantorFilter);
        }

        return result;
    }, [quotations, searchTerm, statusFilter, dateFrom, dateTo, guarantorFilter]);

    // Computed stats
    const completeQuotations = useMemo(
        () => filteredData.filter((q) => q.Status === 'Completed').length,
        [filteredData]
    );
    const incompleteQuotations = useMemo(
        () => filteredData.filter((q) => q.Status === 'Incomplete').length,
        [filteredData]
    );
    const waitingQuotations = useMemo(
        () => filteredData.filter((q) => q.Status === 'Waiting for Approval').length,
        [filteredData]
    );

    const stats = [
        {
            label: 'Total Quotations',
            value: filteredData.length,
            icon: <FileText className="w-5 h-5" />,
            color: 'bg-blue-50 text-blue-600',
            format: (v: number) => v.toString(),
        },
        {
            label: 'Complete Quotations',
            value: completeQuotations,
            icon: <CheckCircle className="w-5 h-5" />,
            color: 'bg-green-50 text-green-600',
            format: (v: number) => v.toString(),
        },
        {
            label: 'Incomplete Quotations',
            value: incompleteQuotations,
            icon: <AlertCircle className="w-5 h-5" />,
            color: 'bg-rose-50 text-rose-600',
            format: (v: number) => v.toString(),
        },
        {
            label: 'Waiting for Approval',
            value: waitingQuotations,
            icon: <Clock className="w-5 h-5" />,
            color: 'bg-amber-50 text-amber-600',
            format: (v: number) => v.toString(),
        },
    ];

    return (
        <SidebarLayout pageTitle="Quotation Records">
            <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                {/* Header */}
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

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {stats.map((stat) => (
                        <div
                            key={stat.label}
                            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4"
                        >
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

                {/* Filters */}
                <ReportsFilter
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    statusFilter={statusFilter}
                    onStatusChange={setStatusFilter}
                    guarantorFilter={guarantorFilter}
                    onGuarantorChange={setGuarantorFilter}
                    availableGuarantors={guarantors.map(g => ({ id: g.id!, Name: g.Name }))}
                    dateFrom={dateFrom}
                    onDateFromChange={setDateFrom}
                    dateTo={dateTo}
                    onDateToChange={setDateTo}
                    availableStatuses={dynamicStatuses}
                />

                {/* Table */}
                <ReportsTable
                    data={filteredData}
                    isLoading={loading}
                    onRefresh={load}
                    onDelete={handleDeleteQuotation}
                    onBulkDelete={handleBulkDeleteQuotation}
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
