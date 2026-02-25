'use client';

import { useState, useEffect } from 'react';

export interface RoleRecord {
    RoleID: string;
    RoleName: string;
    Description: string;
    IsActive: boolean;
}

interface RoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    role?: RoleRecord | null;
    onSave: () => void;
}

export default function RoleModal({ isOpen, onClose, role, onSave }: RoleModalProps) {
    const [roleName, setRoleName] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (role) {
            setRoleName(role.RoleName || '');
            setDescription(role.Description || '');
            setIsActive(role.IsActive !== false);
        } else {
            setRoleName('');
            setDescription('');
            setIsActive(true);
        }
        setError('');
    }, [role, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const endpoint = role ? `/api/roles/${role.RoleID}` : '/api/roles';
            const method = role ? 'PUT' : 'POST';

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ RoleName: roleName, Description: description, IsActive: isActive }),
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to save role.');

            onSave();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {role ? 'Edit Role' : 'Add New Role'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition text-xl leading-none"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    {/* Role Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Role Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            required
                            type="text"
                            value={roleName}
                            onChange={(e) => setRoleName(e.target.value)}
                            placeholder="e.g. Admin, Staff, Billing Officer"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of what this role can do..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition resize-none"
                        />
                    </div>

                    {/* Active toggle */}
                    <div className="flex items-center gap-3">
                        <label className="flex items-center cursor-pointer gap-2">
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-gray-700 font-medium">Active Role</span>
                        </label>
                        <span className="text-xs text-gray-400">(Inactive roles are hidden from user assignment)</span>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition shadow-sm disabled:opacity-60"
                        >
                            {loading ? 'Saving...' : role ? 'Update Role' : 'Create Role'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
