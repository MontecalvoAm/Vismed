'use client';

import { useState, useEffect, useMemo } from 'react';
import { QuotationRecord, getQuotations, computeTotalQuantity, deleteQuotation } from '@/lib/firestore/quotations';
import { createAuditLog } from '@/lib/firestore/audit';
import { useConfirm } from '@/context/ConfirmContext';
import HistoryFilter from '@/components/history/HistoryFilter';
import HistoryTable from '@/components/history/HistoryTable';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { History, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function HistoryPage() {
    const { alert } = useConfirm();
    const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [minQuantity, setMinQuantity] = useState('');

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
        } catch (err) {
            console.error('Error deleting:', err);
            await alert({
                title: 'Delete Failed',
                message: 'Failed to delete quotation.',
                variant: 'danger'
            });
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
        } catch (err) {
            console.error('Error bulk deleting:', err);
            await alert({
                title: 'Delete Failed',
                message: 'Failed to delete some or all selected quotations.',
                variant: 'danger'
            });
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

        if (minQuantity) {
            const min = parseInt(minQuantity, 10);
            result = result.filter((r) => computeTotalQuantity(r.Items ?? []) >= min);
        }

        return result;
    }, [quotations, searchTerm, statusFilter, dateFrom, dateTo, minQuantity]);

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
                <HistoryFilter
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    statusFilter={statusFilter}
                    onStatusChange={setStatusFilter}
                    dateFrom={dateFrom}
                    onDateFromChange={setDateFrom}
                    dateTo={dateTo}
                    onDateToChange={setDateTo}
                    minQuantity={minQuantity}
                    onMinQuantityChange={setMinQuantity}
                    availableStatuses={dynamicStatuses}
                />

                {/* Table */}
                <HistoryTable
                    data={filteredData}
                    isLoading={loading}
                    onRefresh={load}
                    onDelete={handleDeleteQuotation}
                    onBulkDelete={handleBulkDeleteQuotation}
                />
            </div>
        </SidebarLayout>
    );
}
