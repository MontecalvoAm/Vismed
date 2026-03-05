'use client';

import { useState, useEffect, useMemo } from 'react';
import { getUsageLogs, AuditLogEntry, deleteAuditLog } from '@/lib/firestore/audit';
import { getQuotations, QuotationRecord } from '@/lib/firestore/quotations';
import SidebarLayout from '@/components/layout/SidebarLayout';
import AuditLogsTable from '@/components/reports/AuditLogsTable';
import { ShieldCheck, Calendar, Activity, Database, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { FeedbackModal } from '@/components/ui/FeedbackModal';

export default function AuditLogsPage() {
    const { user } = useAuth();
    const [logs, setLogs] = useState<(AuditLogEntry & { id: string })[]>([]);
    const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const [logsData, quotsData] = await Promise.all([
                getUsageLogs(),
                getQuotations()
            ]);
            setLogs(logsData);
            setQuotations(quotsData);
        } catch (err) {
            console.error('Error fetching audit logs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const filteredData = useMemo(() => {
        let result = logs;

        if (searchTerm) {
            const qStr = searchTerm.toLowerCase();
            result = result.filter(
                (r) => {
                    const meta = r.Metadata || {};
                    return (
                        (meta.PatientName && String(meta.PatientName).toLowerCase().includes(qStr)) ||
                        (meta.GuarantorName && String(meta.GuarantorName).toLowerCase().includes(qStr)) ||
                        (meta.EditedBy && String(meta.EditedBy).toLowerCase().includes(qStr)) ||
                        (r.Action && r.Action.toLowerCase().includes(qStr))
                    );
                }
            );
        }

        if (dateFrom) {
            const from = new Date(dateFrom);
            result = result.filter((r) => r.CreatedAt && new Date(r.CreatedAt as string) >= from);
        }

        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            result = result.filter((r) => r.CreatedAt && new Date(r.CreatedAt as string) <= to);
        }

        return result;
    }, [logs, searchTerm, dateFrom, dateTo]);

    // Computed stats
    const totalLogs = filteredData.length;
    const todayLogs = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return filteredData.filter(r => r.CreatedAt && new Date(r.CreatedAt as string) >= today).length;
    }, [filteredData]);

    const stats = [
        {
            label: 'Total Logs',
            value: totalLogs,
            icon: <Database className="w-5 h-5" />,
            color: 'bg-blue-50 text-blue-600',
        },
        {
            label: 'Logs Today',
            value: todayLogs,
            icon: <Calendar className="w-5 h-5" />,
            color: 'bg-green-50 text-green-600',
        },
        {
            label: 'Trackings Updated',
            value: filteredData.filter(r => r.Action === 'UPDATE_TRACKING').length,
            icon: <Activity className="w-5 h-5" />,
            color: 'bg-purple-50 text-purple-600',
        }
    ];

    return (
        <SidebarLayout pageTitle="Audit Logs">
            <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-brand-dark-blue/10 rounded-xl flex items-center justify-center text-brand-dark-blue">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">System Audit Logs</h1>
                            <p className="text-gray-500 mt-0.5">Track usage updates and detailed activity logs.</p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
                                    {loading ? '—' : stat.value.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-end">
                    <div className="w-full md:w-1/3">
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Search className="w-3.5 h-3.5" /> Search Keyword
                        </label>
                        <input
                            type="text"
                            placeholder="Patient/Guarantor Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-brand-dark-blue focus:ring-1 focus:ring-brand-dark-blue transition-colors bg-gray-50"
                        />
                    </div>
                    <div className="w-full md:w-1/4">
                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Date From</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-brand-dark-blue focus:ring-1 focus:ring-brand-dark-blue transition-colors bg-gray-50"
                        />
                    </div>
                    <div className="w-full md:w-1/4">
                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Date To</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-brand-dark-blue focus:ring-1 focus:ring-brand-dark-blue transition-colors bg-gray-50"
                        />
                    </div>
                    <div className="w-full md:w-auto">
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setDateFrom('');
                                setDateTo('');
                            }}
                            className="w-full px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors bg-white shadow-sm"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>

                {/* Table */}
                <AuditLogsTable
                    data={filteredData}
                    quotations={quotations}
                    isLoading={loading}
                    onRefresh={load}
                />
            </div>
        </SidebarLayout>
    );
}
