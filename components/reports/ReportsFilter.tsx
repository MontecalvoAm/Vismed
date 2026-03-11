'use client';

import { useState, useEffect } from 'react';
import { Search, CalendarRange, Filter, Package, Shield } from 'lucide-react';
import SearchableSelect from '@/components/ui/SearchableSelect';

interface ReportsFilterProps {
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

export default function ReportsFilter({
    searchTerm, onSearchChange,
    statusFilter, onStatusChange,
    guarantorFilter, onGuarantorChange,
    availableGuarantors,
    dateFrom, onDateFromChange,
    dateTo, onDateToChange,
    availableStatuses = [],
}: ReportsFilterProps) {
    const [localSearch, setLocalSearch] = useState(searchTerm);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (localSearch !== searchTerm) {
                onSearchChange(localSearch);
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [localSearch, onSearchChange, searchTerm]);

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
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                    />
                </div>
                <div className="relative w-full sm:w-52">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Filter className="h-4 w-4 text-gray-400" />
                    </div>
                    <SearchableSelect
                        options={[
                            { id: 'all', name: 'All Statuses' },
                            ...(availableStatuses.length > 0
                                ? availableStatuses.map(s => ({ id: s, name: s }))
                                : [
                                    { id: 'Incomplete', name: 'Incomplete' },
                                    { id: 'Waiting for Approval', name: 'Waiting for Approval' },
                                    { id: 'Completed', name: 'Completed' }
                                ]
                            )
                        ]}
                        value={statusFilter}
                        onChange={onStatusChange}
                        placeholder="Select Status"
                        displayKey="name"
                        valueKey="id"
                    />
                </div>
                <div className="relative w-full sm:w-52">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Shield className="h-4 w-4 text-gray-400" />
                    </div>
                    <SearchableSelect
                        options={[
                            { id: 'all', name: 'All Guarantors' },
                            ...availableGuarantors.map(g => ({ id: g.Name, name: g.Name }))
                        ]}
                        value={guarantorFilter}
                        onChange={onGuarantorChange}
                        placeholder="Select Guarantor"
                        displayKey="name"
                        valueKey="id"
                    />
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
