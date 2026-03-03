'use client';

import { Search, CalendarRange, Filter, Package, Shield } from 'lucide-react';

interface HistoryFilterProps {
    searchTerm: string;
    onSearchChange: (val: string) => void;
    statusFilter: string;
    onStatusChange: (val: string) => void;
    guarantorFilter: string;
    onGuarantorChange: (val: string) => void;
    availableGuarantors: { id: string; Name: string }[];
    dateFrom: string;
    onDateFromChange: (val: string) => void;
    dateTo: string;
    onDateToChange: (val: string) => void;
    availableStatuses?: string[];
}

export default function HistoryFilter({
    searchTerm, onSearchChange,
    statusFilter, onStatusChange,
    guarantorFilter, onGuarantorChange,
    availableGuarantors,
    dateFrom, onDateFromChange,
    dateTo, onDateToChange,
    availableStatuses = [],
}: HistoryFilterProps) {
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 space-y-3">
            {/* Row 1: search + status */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary focus:outline-none transition-colors"
                        placeholder="Search client name or email..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
                <div className="relative w-full sm:w-52">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Filter className="h-4 w-4 text-gray-400" />
                    </div>
                    <select
                        className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary focus:outline-none appearance-none bg-white transition-colors"
                        value={statusFilter}
                        onChange={(e) => onStatusChange(e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        {availableStatuses.length > 0 ? (
                            availableStatuses.map(s => <option key={s} value={s}>{s}</option>)
                        ) : (
                            <>
                                <option value="Incomplete">Incomplete</option>
                                <option value="Waiting for Approval">Waiting for Approval</option>
                                <option value="Completed">Completed</option>
                            </>
                        )}
                    </select>
                </div>
                <div className="relative w-full sm:w-52">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Shield className="h-4 w-4 text-gray-400" />
                    </div>
                    <select
                        className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary focus:outline-none appearance-none bg-white transition-colors"
                        value={guarantorFilter}
                        onChange={(e) => onGuarantorChange(e.target.value)}
                    >
                        <option value="all">All Guarantors</option>
                        {availableGuarantors.map(g => <option key={g.id} value={g.Name}>{g.Name}</option>)}
                    </select>
                </div>
            </div>

            {/* Row 2: date range + min sessions */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-2 flex-1">
                    <CalendarRange className="h-4 w-4 text-gray-400 shrink-0" />
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => onDateFromChange(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary focus:outline-none transition-colors"
                        title="From date"
                    />
                    <span className="text-gray-400 text-xs">to</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => onDateToChange(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary focus:outline-none transition-colors"
                        title="To date"
                    />
                </div>
            </div>
        </div>
    );
}
