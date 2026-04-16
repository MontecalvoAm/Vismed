import { Search, Filter, Shield } from 'lucide-react';
import SearchableSelect from '@/components/ui/SearchableSelect';

interface UsersFilterProps {
    searchTerm: string;
    onSearchChange: (val: string) => void;
    roleFilter: string;
    onRoleChange: (val: string) => void;
    availableRoles: { id: string; name: string }[];
    statusFilter: string;
    onStatusChange: (val: string) => void;
    children?: React.ReactNode;
}

export default function UsersFilter({
    searchTerm, onSearchChange,
    roleFilter, onRoleChange,
    availableRoles,
    statusFilter, onStatusChange,
    children
}: UsersFilterProps) {
    return (
        <div className="bg-white py-2 px-4 rounded-xl shadow-sm border border-gray-200 w-full hover:border-gray-300 transition-colors">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="relative flex-1 w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-primary focus:border-primary focus:outline-none transition-colors shadow-sm"
                        placeholder="Search name or email..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-52">
                    <SearchableSelect
                        options={[
                            { id: 'all', name: 'All Roles' },
                            ...availableRoles
                        ]}
                        value={roleFilter}
                        onChange={onRoleChange}
                        placeholder="Select Role"
                        displayKey="name"
                        valueKey="id"
                    />
                </div>
                <div className="w-full sm:w-52">
                    <SearchableSelect
                        options={[
                            { id: 'all', name: 'All Statuses' },
                            { id: 'active', name: 'Active' },
                            { id: 'inactive', name: 'Inactive' }
                        ]}
                        value={statusFilter}
                        onChange={onStatusChange}
                        placeholder="Select Status"
                        displayKey="name"
                        valueKey="id"
                    />
                </div>
                {children && (
                    <div className="w-full sm:w-auto flex justify-end shrink-0 ml-auto">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}
