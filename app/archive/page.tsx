'use client';

import { useState, useEffect, useCallback } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useAuth } from '@/context/AuthContext';
import { useConfirm } from '@/context/ConfirmContext';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import AccessDenied from '@/components/AccessDenied';
import {
    Archive, Users, ShieldCheck, Building2, Stethoscope, ClipboardList,
    History, RotateCcw, Trash2, Search, ChevronLeft, ChevronRight,
    CheckCircle, XCircle, User as UserIcon, Shield,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────

type ArchiveTab = 'guarantors' | 'quotations' | 'departments' | 'services' | 'users' | 'logs';

interface ArchiveRecord {
    id: string;
    [key: string]: any;
}

// ── Helpers ────────────────────────────────────────────────────

const COLLECTION_MAP: Record<ArchiveTab, string> = {
    guarantors: 'guarantors',
    quotations: 'quotations',
    departments: 'departments',
    services: 'services',
    users: 'users',
    logs: 'logs',
};

function formatDate(val: any): string {
    if (!val) return '—';
    try {
        return new Date(val).toLocaleDateString('en-PH', {
            month: 'short', day: 'numeric', year: 'numeric',
        });
    } catch { return '—'; }
}

// ── Status Badge ───────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {active
                ? <><CheckCircle className="w-3 h-3" /> Active</>
                : <><XCircle className="w-3 h-3" /> Inactive</>
            }
        </span>
    );
}

// ── Action Buttons ─────────────────────────────────────────────

function ActionButtons({
    onRestore,
    onDelete,
    canEdit,
    canDelete,
}: {
    onRestore: () => void;
    onDelete: () => void;
    canEdit?: boolean;
    canDelete?: boolean;
}) {
    return (
        <div className="flex items-center justify-end gap-2">
            {canEdit && (
                <button
                    onClick={onRestore}
                    title="Restore record"
                    className="p-1.5 rounded-lg text-green-500 hover:text-white hover:bg-green-500 transition-all shadow-sm border border-brand-light-grey/20 bg-white"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
            )}
            {canDelete && (
                <button
                    onClick={onDelete}
                    title="Permanently delete"
                    className="p-1.5 rounded-lg text-red-500 hover:text-white hover:bg-red-500 transition-all shadow-sm border border-brand-light-grey/20 bg-white"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}

// ── Pagination ─────────────────────────────────────────────────

function usePagination<T>(items: T[], perPage: number) {
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(perPage);

    const total = Math.max(1, Math.ceil(items.length / rowsPerPage));
    const safePage = Math.min(page, total);
    const paginated = items.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

    useEffect(() => { if (page > total) setPage(total); }, [total, page]);

    return { page: safePage, setPage, rowsPerPage, setRowsPerPage, total, paginated };
}

// ── Generic Pagination Footer ──────────────────────────────────

function PaginationFooter({
    page, total, rowsPerPage, onPageChange, onRowsChange, totalItems,
}: {
    page: number; total: number; rowsPerPage: number;
    onPageChange: (p: number) => void;
    onRowsChange: (n: number) => void;
    totalItems: number;
}) {
    return (
        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm bg-white">
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-gray-500">Show</span>
                    <select
                        value={rowsPerPage}
                        onChange={(e) => { onRowsChange(Number(e.target.value)); onPageChange(1); }}
                        className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:ring-primary focus:border-primary outline-none shadow-sm"
                    >
                        {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <span className="text-gray-500">entries</span>
                </div>
                <span className="text-gray-500 text-center sm:text-left">
                    {totalItems === 0 ? 'No entries' : `Showing ${(page - 1) * rowsPerPage + 1} to ${Math.min(page * rowsPerPage, totalItems)} of ${totalItems} entries`}
                </span>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page === 1 || totalItems === 0}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 font-medium text-gray-700">Page {page} of {total}</span>
                <button
                    onClick={() => onPageChange(Math.min(total, page + 1))}
                    disabled={page === total || totalItems === 0}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

// ── Table Shell ────────────────────────────────────────────────

function TableShell({
    loading, empty, emptyMsg, children, search, onSearch,
}: {
    loading: boolean;
    empty: boolean;
    emptyMsg: string;
    children: React.ReactNode;
    search: string;
    onSearch: (v: string) => void;
}) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            {/* Search bar */}
            <div className="p-4 border-b border-gray-100 bg-white">
                <div className="relative w-full sm:max-w-sm">
                    <input
                        type="search"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => onSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-slate-700"
                    />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>
            {loading ? (
                <div className="px-6 py-12 text-center text-gray-400 text-sm">Loading archived records...</div>
            ) : empty ? (
                <div className="px-6 py-12 text-center text-gray-400 text-sm">{emptyMsg}</div>
            ) : (
                children
            )}
        </div>
    );
}

// ── Main Archive Page ──────────────────────────────────────────

export default function ArchivePage() {
    const { user } = useAuth();
    const { confirm } = useConfirm();
    const perms = user?.Permissions?.Archive;

    const [activeTab, setActiveTab] = useState<ArchiveTab>('guarantors');
    const [records, setRecords] = useState<ArchiveRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [feedback, setFeedback] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
        isOpen: false, type: 'success', title: '', message: ''
    });

    // ── Fetch ────────────────────────────────────────────────────
    const loadRecords = useCallback(async (tab: ArchiveTab) => {
        setLoading(true);
        setSearch('');
        try {
            const res = await fetch(`/api/archive?tab=${tab}`);
            const data = await res.json();
            if (data.success) setRecords(data.records || []);
            else throw new Error(data.error);
        } catch (e: any) {
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: e.message || 'Failed to load archive' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadRecords(activeTab); }, [activeTab, loadRecords]);

    // ── Actions ──────────────────────────────────────────────────
    const handleRestore = async (record: ArchiveRecord) => {
        const confirmed = await confirm({
            title: 'Restore Record',
            message: 'Are you sure you want to restore this record? It will be moved back to its module.',
            variant: 'info',
            confirmText: 'Restore',
        });
        if (!confirmed) return;
        try {
            const res = await fetch('/api/archive/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ collection: COLLECTION_MAP[activeTab], id: record.id }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setFeedback({ isOpen: true, type: 'success', title: 'Restored', message: 'Record restored successfully.' });
            loadRecords(activeTab);
        } catch (e: any) {
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: e.message });
        }
    };

    const handlePermanentDelete = async (record: ArchiveRecord) => {
        const confirmed = await confirm({
            title: 'Permanently Delete',
            message: '⚠️ This will permanently delete this record and cannot be undone. Are you sure?',
            variant: 'danger',
            confirmText: 'Delete Permanently',
        });
        if (!confirmed) return;
        try {
            const res = await fetch('/api/archive/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ collection: COLLECTION_MAP[activeTab], id: record.id }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setFeedback({ isOpen: true, type: 'success', title: 'Deleted', message: 'Record permanently deleted.' });
            loadRecords(activeTab);
        } catch (e: any) {
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: e.message });
        }
    };

    // ── Tabs ─────────────────────────────────────────────────────
    const tabs: { key: ArchiveTab; label: string; icon: React.ReactNode }[] = [
        { key: 'guarantors', label: 'Guarantors', icon: <Shield className="w-4 h-4" /> },
        { key: 'quotations', label: 'Quotations', icon: <ClipboardList className="w-4 h-4" /> },
        { key: 'departments', label: 'Departments', icon: <Building2 className="w-4 h-4" /> },
        { key: 'services', label: 'Services & Items', icon: <Stethoscope className="w-4 h-4" /> },
        { key: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
        { key: 'logs', label: 'Logs', icon: <History className="w-4 h-4" /> },
    ];

    // ── Access control ───────────────────────────────────────────
    if (!perms?.CanView) {
        return (
            <SidebarLayout pageTitle="Archive">
                <AccessDenied />
            </SidebarLayout>
        );
    }

    // ── Render sub-tables ────────────────────────────────────────
    const renderTabContent = () => {
        switch (activeTab) {
            case 'guarantors': return (
                <GuarantorsTab records={records} loading={loading} search={search} onSearch={setSearch}
                    perms={perms} onRestore={handleRestore} onDelete={handlePermanentDelete} />
            );
            case 'quotations': return (
                <QuotationsTab records={records} loading={loading} search={search} onSearch={setSearch}
                    perms={perms} onRestore={handleRestore} onDelete={handlePermanentDelete} />
            );
            case 'departments': return (
                <DepartmentsTab records={records} loading={loading} search={search} onSearch={setSearch}
                    perms={perms} onRestore={handleRestore} onDelete={handlePermanentDelete} />
            );
            case 'services': return (
                <ServicesTab records={records} loading={loading} search={search} onSearch={setSearch}
                    perms={perms} onRestore={handleRestore} onDelete={handlePermanentDelete} />
            );
            case 'users': return (
                <UsersTab records={records} loading={loading} search={search} onSearch={setSearch}
                    perms={perms} onRestore={handleRestore} onDelete={handlePermanentDelete} />
            );
            case 'logs': return (
                <LogsTab records={records} loading={loading} search={search} onSearch={setSearch} />
            );
        }
    };

    return (
        <SidebarLayout pageTitle="Archive">
            <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">

                {/* Page Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                        <Archive className="w-8 h-8 text-gray-600" />
                        Archive
                    </h1>
                    <p className="text-gray-500 mt-1">View and manage all deleted records.</p>
                </div>

                {/* Tab Switcher */}
                <div className="mb-6 overflow-x-auto">
                    <div className="inline-flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm gap-1 min-w-max">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.key
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

                {/* Tab Content */}
                {renderTabContent()}
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

// ══════════════════════════════════════════════════════════════
//  SUB-TABLES
// ══════════════════════════════════════════════════════════════

interface TabProps {
    records: ArchiveRecord[];
    loading: boolean;
    search: string;
    onSearch: (v: string) => void;
    perms?: any;
    onRestore: (r: ArchiveRecord) => void;
    onDelete: (r: ArchiveRecord) => void;
}

// ── Guarantors Tab ────────────────────────────────────────────

function GuarantorsTab({ records, loading, search, onSearch, perms, onRestore, onDelete }: TabProps) {
    const filtered = records.filter(r =>
        (r.Name || r.GuarantorName || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.Description || '').toLowerCase().includes(search.toLowerCase())
    );
    const { page, setPage, rowsPerPage, setRowsPerPage, total, paginated } = usePagination(filtered, 10);

    return (
        <TableShell loading={loading} empty={!loading && filtered.length === 0}
            emptyMsg="No archived guarantors." search={search} onSearch={onSearch}>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50/80">
                        <tr>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Name</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Description</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Deleted On</th>
                            {(perms?.CanEdit || perms?.CanDelete) && (
                                <th className="px-6 py-4 text-right font-semibold text-gray-600 tracking-wider">Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {paginated.map(r => (
                            <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{r.Name || r.GuarantorName || '—'}</td>
                                <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{r.Description || <span className="italic text-gray-300">—</span>}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-xs">{formatDate(r.UpdatedAt)}</td>
                                {(perms?.CanEdit || perms?.CanDelete) && (
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <ActionButtons onRestore={() => onRestore(r)} onDelete={() => onDelete(r)} canEdit={perms?.CanEdit} canDelete={perms?.CanDelete} />
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <PaginationFooter page={page} total={total} rowsPerPage={rowsPerPage}
                onPageChange={setPage} onRowsChange={setRowsPerPage} totalItems={filtered.length} />
        </TableShell>
    );
}

// ── Quotations Tab ────────────────────────────────────────────

function QuotationsTab({ records, loading, search, onSearch, perms, onRestore, onDelete }: TabProps) {
    const filtered = records.filter(r =>
        (r.CustomerFirstName || r.CustomerName || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.CustomerLastName || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.DocumentNo || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.PreparedBy || '').toLowerCase().includes(search.toLowerCase())
    );
    const { page, setPage, rowsPerPage, setRowsPerPage, total, paginated } = usePagination(filtered, 10);

    return (
        <TableShell loading={loading} empty={!loading && filtered.length === 0}
            emptyMsg="No archived quotations." search={search} onSearch={onSearch}>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50/80">
                        <tr>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Document No.</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Patient</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Prepared By</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Guarantor</th>
                            <th className="px-6 py-4 text-right font-semibold text-gray-600 tracking-wider">Total</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Deleted On</th>
                            {(perms?.CanEdit || perms?.CanDelete) && (
                                <th className="px-6 py-4 text-right font-semibold text-gray-600 tracking-wider">Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {paginated.map(r => (
                            <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-600">{r.DocumentNo || '—'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                            {(r.CustomerFirstName || r.CustomerName || '?').charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {r.CustomerFirstName ? `${r.CustomerFirstName} ${r.CustomerLastName || ''}` : r.CustomerName}
                                            </div>
                                            <div className="text-xs text-gray-400">{r.CustomerEmail || r.CustomerPhone || ''}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-xs">
                                    <div className="flex items-center gap-1"><UserIcon className="w-3 h-3" />{r.PreparedBy || '—'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-xs">
                                    <div className="flex items-center gap-1"><Shield className="w-3 h-3" />{r.GuarantorName || '—'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">
                                    ₱{(r.Total ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-xs">{formatDate(r.UpdatedAt)}</td>
                                {(perms?.CanEdit || perms?.CanDelete) && (
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <ActionButtons onRestore={() => onRestore(r)} onDelete={() => onDelete(r)} canEdit={perms?.CanEdit} canDelete={perms?.CanDelete} />
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <PaginationFooter page={page} total={total} rowsPerPage={rowsPerPage}
                onPageChange={setPage} onRowsChange={setRowsPerPage} totalItems={filtered.length} />
        </TableShell>
    );
}

// ── Departments Tab ───────────────────────────────────────────

function DepartmentsTab({ records, loading, search, onSearch, perms, onRestore, onDelete }: TabProps) {
    const filtered = records.filter(r =>
        (r.DepartmentName || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.Description || '').toLowerCase().includes(search.toLowerCase())
    );
    const { page, setPage, rowsPerPage, setRowsPerPage, total, paginated } = usePagination(filtered, 10);

    return (
        <TableShell loading={loading} empty={!loading && filtered.length === 0}
            emptyMsg="No archived departments." search={search} onSearch={onSearch}>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50/80">
                        <tr>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Department Name</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Description</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Deleted On</th>
                            {(perms?.CanEdit || perms?.CanDelete) && (
                                <th className="px-6 py-4 text-right font-semibold text-gray-600 tracking-wider">Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {paginated.map(r => (
                            <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{r.DepartmentName || '—'}</td>
                                <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{r.Description || <span className="italic text-gray-300">—</span>}</td>
                                <td className="px-6 py-4 whitespace-nowrap"><StatusBadge active={r.IsActive === true} /></td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-xs">{formatDate(r.UpdatedAt)}</td>
                                {(perms?.CanEdit || perms?.CanDelete) && (
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <ActionButtons onRestore={() => onRestore(r)} onDelete={() => onDelete(r)} canEdit={perms?.CanEdit} canDelete={perms?.CanDelete} />
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <PaginationFooter page={page} total={total} rowsPerPage={rowsPerPage}
                onPageChange={setPage} onRowsChange={setRowsPerPage} totalItems={filtered.length} />
        </TableShell>
    );
}

// ── Services Tab ──────────────────────────────────────────────

function ServicesTab({ records, loading, search, onSearch, perms, onRestore, onDelete }: TabProps) {
    const filtered = records.filter(r =>
        (r.ServiceName || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.Description || '').toLowerCase().includes(search.toLowerCase())
    );
    const { page, setPage, rowsPerPage, setRowsPerPage, total, paginated } = usePagination(filtered, 10);

    return (
        <TableShell loading={loading} empty={!loading && filtered.length === 0}
            emptyMsg="No archived services or items." search={search} onSearch={onSearch}>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50/80">
                        <tr>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Service Name</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Unit</th>
                            <th className="px-6 py-4 text-right font-semibold text-gray-600 tracking-wider">Price</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Deleted On</th>
                            {(perms?.CanEdit || perms?.CanDelete) && (
                                <th className="px-6 py-4 text-right font-semibold text-gray-600 tracking-wider">Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {paginated.map(r => (
                            <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{r.ServiceName || '—'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{r.Unit || '—'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">
                                    ₱{(r.Price ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap"><StatusBadge active={r.IsActive === true} /></td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-xs">{formatDate(r.UpdatedAt)}</td>
                                {(perms?.CanEdit || perms?.CanDelete) && (
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <ActionButtons onRestore={() => onRestore(r)} onDelete={() => onDelete(r)} canEdit={perms?.CanEdit} canDelete={perms?.CanDelete} />
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <PaginationFooter page={page} total={total} rowsPerPage={rowsPerPage}
                onPageChange={setPage} onRowsChange={setRowsPerPage} totalItems={filtered.length} />
        </TableShell>
    );
}

// ── Users Tab ─────────────────────────────────────────────────

function UsersTab({ records, loading, search, onSearch, perms, onRestore, onDelete }: TabProps) {
    const filtered = records.filter(r =>
        (r.FirstName || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.LastName || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.Email || '').toLowerCase().includes(search.toLowerCase())
    );
    const { page, setPage, rowsPerPage, setRowsPerPage, total, paginated } = usePagination(filtered, 10);

    return (
        <TableShell loading={loading} empty={!loading && filtered.length === 0}
            emptyMsg="No archived users." search={search} onSearch={onSearch}>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50/80">
                        <tr>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Name</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Email</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Deleted On</th>
                            {(perms?.CanEdit || perms?.CanDelete) && (
                                <th className="px-6 py-4 text-right font-semibold text-gray-600 tracking-wider">Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {paginated.map(r => (
                            <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                            {r.FirstName?.charAt(0)}{r.LastName?.charAt(0)}
                                        </div>
                                        <span className="font-medium text-gray-900">{r.FirstName} {r.LastName}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{r.Email}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {/* Deleted users are always Inactive */}
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                        <XCircle className="w-3 h-3" /> Inactive
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-xs">{formatDate(r.UpdatedAt)}</td>
                                {(perms?.CanEdit || perms?.CanDelete) && (
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <ActionButtons onRestore={() => onRestore(r)} onDelete={() => onDelete(r)} canEdit={perms?.CanEdit} canDelete={perms?.CanDelete} />
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <PaginationFooter page={page} total={total} rowsPerPage={rowsPerPage}
                onPageChange={setPage} onRowsChange={setRowsPerPage} totalItems={filtered.length} />
        </TableShell>
    );
}

// ── Logs Tab (read-only) ──────────────────────────────────────

function LogsTab({ records, loading, search, onSearch }: Omit<TabProps, 'perms' | 'onRestore' | 'onDelete'>) {
    const filtered = records.filter(r =>
        (r.Action || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.Module || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.Description || '').toLowerCase().includes(search.toLowerCase())
    );
    const { page, setPage, rowsPerPage, setRowsPerPage, total, paginated } = usePagination(filtered, 10);

    return (
        <TableShell loading={loading} empty={!loading && filtered.length === 0}
            emptyMsg="No audit logs found." search={search} onSearch={onSearch}>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50/80">
                        <tr>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Date</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Module</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Action</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Description</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {paginated.map((r, idx) => (
                            <tr key={r.id || idx} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-xs">{formatDate(r.CreatedAt)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">{r.Module || '—'}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-700">{r.Action || '—'}</td>
                                <td className="px-6 py-4 text-gray-500 max-w-md truncate">{r.Description || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <PaginationFooter page={page} total={total} rowsPerPage={rowsPerPage}
                onPageChange={setPage} onRowsChange={setRowsPerPage} totalItems={filtered.length} />
        </TableShell>
    );
}
