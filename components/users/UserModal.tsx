'use client';

import { useState, useEffect } from 'react';
import { UserRecord } from '@/lib/firestore/users';
import { getRoles } from '@/lib/firestore/roles';
import type { RoleRecord } from '@/components/users/RoleModal';
import { FeedbackModal } from '@/components/ui/FeedbackModal';

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user?: UserRecord | null;
    onSave: () => void;
}

export default function UserModal({ isOpen, onClose, user, onSave }: UserModalProps) {
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [roles, setRoles] = useState<RoleRecord[]>([]);
    const [rolesLoading, setRolesLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    });

    // Load active roles from Firestore directly (client SDK)
    useEffect(() => {
        if (!isOpen) return;
        setRolesLoading(true);
        getRoles()
            .then((data) => {
                const active = data.filter((r) => r.IsActive !== false) as RoleRecord[];
                setRoles(active);
                if (!user && active.length > 0) {
                    setRole(active[0].RoleID);
                }
            })
            .catch(console.error)
            .finally(() => setRolesLoading(false));
    }, [isOpen, user]);

    useEffect(() => {
        if (user) {
            setEmail(user.Email || '');
            setFirstName(user.FirstName || '');
            setLastName(user.LastName || '');
            setRole(user.RoleID || '');
            setIsActive(user.IsActive !== false);
            setPassword('');
        } else {
            setEmail('');
            setFirstName('');
            setLastName('');
            setIsActive(true);
            setPassword('');
        }
        setError('');
    }, [user, isOpen]);

    if (!isOpen) return null;

    const isStrongPassword = (password: string) => {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
        return passwordRegex.test(password);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const endpoint = user ? `/api/users/${user.UserID}` : '/api/users';
            const method = user ? 'PUT' : 'POST';

            const payload: any = {
                Email: email,
                FirstName: firstName,
                LastName: lastName,
                RoleID: role,
                IsActive: isActive,
            };

            if (password) {
                if (!isStrongPassword(password)) {
                    throw new Error('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
                }
                payload.Password = password;
            } else if (!user) {
                throw new Error('Password is required for new users.');
            }

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to save user.');

            setFeedback({ isOpen: true, type: 'success', title: 'Success', message: user ? 'User updated successfully.' : 'User created successfully.' });
        } catch (err: any) {
            setError(err.message);
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: err.message || 'Failed to save user.' });
        } finally {
            setLoading(false);
        }
    };

    const handleFeedbackClose = () => {
        setFeedback(f => ({ ...f, isOpen: false }));
        if (feedback.type === 'success') {
            onSave();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {user ? 'Edit User' : 'Add New User'}
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

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                            <input
                                required
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                            <input
                                required
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            required
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password{' '}
                            {user && <span className="text-gray-400 text-xs font-normal">(Leave blank to keep current)</span>}
                        </label>
                        <input
                            required={!user}
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <select
                                required
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                disabled={rolesLoading}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition disabled:bg-gray-50 disabled:text-gray-400"
                            >
                                {rolesLoading ? (
                                    <option value="">Loading roles...</option>
                                ) : roles.length === 0 ? (
                                    <option value="">No roles available</option>
                                ) : (
                                    roles.map((r) => (
                                        <option key={r.RoleID} value={r.RoleID}>
                                            {r.RoleName}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                        <div className="flex items-center mt-6">
                            <label className="flex items-center cursor-pointer gap-2">
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-gray-700 font-medium">Active User</span>
                            </label>
                        </div>
                    </div>

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
                            disabled={loading || rolesLoading}
                            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition shadow-sm disabled:opacity-60"
                        >
                            {loading ? 'Saving...' : user ? 'Update User' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>

            <FeedbackModal
                isOpen={feedback.isOpen}
                type={feedback.type}
                title={feedback.title}
                message={feedback.message}
                onClose={handleFeedbackClose}
            />
        </div>
    );
}
