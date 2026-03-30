'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import AuditLogsTable from '@/components/reports/AuditLogsTable';
import StandardAuditLogsTable from '@/components/reports/StandardAuditLogsTable';
import { ShieldCheck, Calendar, Activity, Database, Search, FileText, LogIn, PlusCircle, Edit } from 'lucide-react';

interface AuditLogsViewProps {
    initialLogs: any[];
    initialQuotations: any[];
}

export default function AuditLogsView({ initialLogs, initialQuotations }: AuditLogsViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const activeTab = searchParams.get('tab') || 'quotations';
    const searchTerm = searchParams.get('search') || '';
    const dateFrom = searchParams.get('from') || '';
    const dateTo = searchParams.get('to') || '';

    const updateQuery = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, val]) => {
            if (val === null || val === '') params.delete(key);
            else params.set(key, val);
        });
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const tabs = [
        { key: 'quotations', label: 'Quotation Logs', icon: <FileText className="w-4 h-4" /> },
        { key: 'logins', label: 'Login Logs', icon: <LogIn className="w-4 h-4" /> },
        { key: 'created', label: 'Created Logs', icon: <PlusCircle className="w-4 h-4" /> },
        { key: 'editing', label: 'Editing Logs', icon: <Edit className="w-4 h-4" /> },
    ];

    const tabFilteredData = useMemo(() => {
        return initialLogs.filter((r) => {
            const action = (r.Action || '').toUpperCase();
            const module = (r.Module || '').toUpperCase();

            switch (activeTab) {
                case 'logins':
                    return action.includes('LOGIN') || action.includes('LOGOUT') || action.includes('SESSION');
                case 'created':
                    return action.startsWith('CREATE') || action.includes('_CREATED');
                case 'editing':
                    return action !== 'UPDATE_TRACKING' && (action.startsWith('UPDATE') || action.startsWith('EDIT') || action.includes('_MODIFIED'));
                case 'quotations':
                default:
                    return action === 'UPDATE_TRACKING' || module === 'QUOTATION' || module === 'QUOTATIONS';
            }
        });
    }, [initialLogs, activeTab]);

    const filteredData = useMemo(() => {
        let result = tabFilteredData;

        if (searchTerm) {
            const qStr = searchTerm.toLowerCase();
            result = result.filter(
                (r) => {
                    const meta = r.Metadata || {};
                    return (
                         (meta.PatientName && String(meta.PatientName).toLowerCase().includes(qStr)) ||
                         (meta.GuarantorName && String(meta.GuarantorName).toLowerCase().includes(qStr)) ||
                         (meta.EditedBy && String(meta.EditedBy).toLowerCase().includes(qStr)) ||
                         (r.UserID && String(r.UserID).toLowerCase().includes(qStr)) ||
                         (r.Action && r.Action.toLowerCase().includes(qStr)) ||
                         (r.Target && r.Target.toLowerCase().includes(qStr)) ||
                         (r.Description && r.Description.toLowerCase().includes(qStr))
                    );
                }
            );
        }

        if (dateFrom) {
            const from = new Date(dateFrom);
            from.setHours(0, 0, 0, 0);
            result = result.filter((r) => r.CreatedAt && new Date(r.CreatedAt as string) >= from);
        }

        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            result = result.filter((r) => r.CreatedAt && new Date(r.CreatedAt as string) <= to);
        }

        return result;
    }, [tabFilteredData, searchTerm, dateFrom, dateTo]);

    // Computed stats for ALL logs, regardless of tab, for a persistent dashboard feel
    const todayLogs = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return initialLogs.filter(r => r.CreatedAt && new Date(r.CreatedAt as string) >= today).length;
    }, [initialLogs]);

    const stats = [
        {
            label: 'Total System Logs',
            value: initialLogs.length,
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
            value: initialLogs.filter(r => r.Action === 'UPDATE_TRACKING').length,
            icon: <Activity className="w-5 h-5" />,
            color: 'bg-purple-50 text-purple-600',
        }
    ];

    return (
        <div className="animate-in fade-in duration-500">
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
                                {stat.value.toLocaleString()}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tab Navigation */}
            <div className="mb-6">
                <div className="inline-flex flex-wrap items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => updateQuery({ tab: tab.key, search: null, from: null, to: null })}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-1/3">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Search className="w-3.5 h-3.5" /> Search Keyword
                    </label>
                    <input
                        type="text"
                        placeholder="Search logs..."
                        value={searchTerm}
                        onChange={(e) => updateQuery({ search: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-brand-dark-blue focus:ring-1 focus:ring-brand-dark-blue transition-colors bg-gray-50"
                    />
                </div>
                <div className="w-full md:w-1/4">
                    <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Date From</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => updateQuery({ from: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-brand-dark-blue focus:ring-1 focus:ring-brand-dark-blue transition-colors bg-gray-50"
                    />
                </div>
                <div className="w-full md:w-1/4">
                    <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Date To</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => updateQuery({ to: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-brand-dark-blue focus:ring-1 focus:ring-brand-dark-blue transition-colors bg-gray-50"
                    />
                </div>
                <div className="w-full md:w-auto">
                    <button
                        onClick={() => updateQuery({ search: null, from: null, to: null })}
                        className="w-full px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors bg-white shadow-sm"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Table */}
            {activeTab === 'quotations' ? (
                <AuditLogsTable
                    data={filteredData}
                    quotations={initialQuotations}
                    isLoading={false}
                />
            ) : (
                <StandardAuditLogsTable
                    data={filteredData}
                    isLoading={false}
                    activeTab={activeTab}
                />
            )}
        </div>
    );
}
