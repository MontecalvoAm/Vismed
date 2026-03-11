'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, Save, Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { useAuth } from '@/context/AuthContext';

const isStrongPassword = (password: string) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    return passwordRegex.test(password);
};

export default function SettingsClient({
    serverUser
}: {
    serverUser: any
}) {
    const { refreshUser } = useAuth();

    // Profile State
    const [firstName, setFirstName] = useState(serverUser?.FirstName || '');
    const [lastName, setLastName] = useState(serverUser?.LastName || '');

    // Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // UI State
    const [isUpdating, setIsUpdating] = useState(false);
    const [feedbackModal, setFeedbackModal] = useState({
        isOpen: false,
        type: 'success' as 'success' | 'error',
        title: '',
        message: ''
    });

    const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation for Password if user started typing one
        const isChangingPassword = currentPassword || newPassword || confirmPassword;
        if (isChangingPassword) {
            if (!currentPassword || !newPassword || !confirmPassword) {
                setFeedbackModal({
                    isOpen: true,
                    type: 'error',
                    title: 'Incomplete Password Fields',
                    message: 'Please fill out all password fields to change your password.'
                });
                return;
            }
            if (newPassword !== confirmPassword) {
                setFeedbackModal({
                    isOpen: true,
                    type: 'error',
                    title: 'Passwords Do Not Match',
                    message: 'The new password and confirm password do not match.'
                });
                return;
            }
            if (!isStrongPassword(newPassword)) {
                setFeedbackModal({
                    isOpen: true,
                    type: 'error',
                    title: 'Weak Password',
                    message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
                });
                return;
            }
        }

        setIsUpdating(true);

        try {
            // Prepare Payload
            const payload: any = {
                FirstName: firstName,
                LastName: lastName,
            };

            if (isChangingPassword) {
                payload.CurrentPassword = currentPassword;
                payload.NewPassword = newPassword;
            }

            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to update settings.');
            }

            // Success
            await refreshUser();
            setFeedbackModal({
                isOpen: true,
                type: 'success',
                title: 'Settings Saved',
                message: 'Your account settings have been successfully updated.'
            });

            // Clear password fields on success
            if (isChangingPassword) {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }

        } catch (err: any) {
            setFeedbackModal({
                isOpen: true,
                type: 'error',
                title: 'Update Failed',
                message: err.message || 'An unexpected error occurred.'
            });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full pb-24">
            {/* Header Title */}
            <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                    <div className="p-2.5 bg-brand-light-grey/30 rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                    </div>
                    Account Settings
                </h1>
                <p className="mt-2 text-sm text-slate-500 max-w-2xl">
                    Manage your profile information and account security.
                </p>
            </div>

            <form onSubmit={handleSaveChanges} className="space-y-6">
                {/* Security Info Panel */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-start gap-4 shadow-sm">
                    <div className="mt-0.5 text-blue-500 bg-white rounded-full p-2 border border-blue-100 shadow-sm shrink-0">
                        <UserIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-blue-900 mb-1">Account Information</h3>
                        <p className="text-sm text-blue-800/80 leading-relaxed max-w-3xl">
                            You can update your First Name and Last Name below. However, your Email Address can only be changed by an Administrator.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* Profile Update Form */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-brand-primary"></div>
                        <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                            <UserIcon className="w-5 h-5 text-slate-400" /> Profile Details
                        </h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">First Name <span className="text-brand-bright-red">*</span></label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Last Name <span className="text-brand-bright-red">*</span></label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                                <input
                                    type="email"
                                    value={serverUser?.Email}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-sm cursor-not-allowed"
                                    disabled
                                    readOnly
                                />
                                <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                                    <ShieldAlert className="w-3.5 h-3.5" /> Email cannot be changed here.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Password Update Form */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-brand-bright-red"></div>
                        <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-slate-400" /> Change Password
                        </h2>

                        <div className="space-y-4">
                            <p className="text-sm text-slate-500 mb-4">Leave these fields blank if you do not wish to change your password.</p>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Current Password</label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? "text" : "password"}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all pr-10"
                                        placeholder="Enter your current password"
                                    />
                                    {currentPassword && (
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="pt-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all pr-10"
                                        placeholder="Create a new password"
                                    />
                                    {newPassword && (
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    )}
                                </div>
                                {newPassword && (
                                    <p className="mt-1.5 text-xs text-slate-500">
                                        Must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character.
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-brand-bright-red transition-all pr-10"
                                        placeholder="Re-enter your new password"
                                    />
                                    {confirmPassword && (
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Action Area */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-4 pb-2">
                    <p className="text-sm text-slate-500 font-medium text-center sm:text-left">
                        Unsaved changes will be lost if you leave this page.
                    </p>
                    <button
                        type="submit"
                        disabled={isUpdating}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-xl transition-colors shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed w-full sm:w-auto"
                    >
                        {isUpdating ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </form>

            <FeedbackModal
                isOpen={feedbackModal.isOpen}
                type={feedbackModal.type}
                title={feedbackModal.title}
                message={feedbackModal.message}
                onClose={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
