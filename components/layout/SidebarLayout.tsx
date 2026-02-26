'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
    LayoutDashboard,
    ClipboardList,
    History,
    Building2,
    Stethoscope,
    Users,
    Menu,
    X,
    LogOut,
} from 'lucide-react';

interface SidebarLayoutProps {
    children: React.ReactNode;
    pageTitle?: string;
}

export default function SidebarLayout({ children, pageTitle = 'Quotation System' }: SidebarLayoutProps) {
    const { user, loading, logout } = useAuth();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Build navigation tabs based on resolved permissions and core routes
    const navTabs = [
        { href: '/quotation', label: 'Quotation', icon: <LayoutDashboard className="w-4 h-4" /> },
        { href: '/history', label: 'Records', icon: <ClipboardList className="w-4 h-4" /> },
        ...(user?.Permissions?.Departments?.CanView ? [{ href: '/departments', label: 'Departments', icon: <Building2 className="w-4 h-4" /> }] : []),
        ...(user?.Permissions?.Services?.CanView ? [{ href: '/services', label: 'Items and Services', icon: <Stethoscope className="w-4 h-4" /> }] : []),
        ...(user?.Permissions?.Users?.CanView ? [{ href: '/users', label: 'Users', icon: <Users className="w-4 h-4" /> }] : []),
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 text-sm">Loading your workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative bg-brand-light-grey/20 text-slate-900 flex font-sans selection:bg-brand-lime-green/20">
            {/* Global Background Logo Watermark */}
            <div className="fixed inset-0 -z-10 pointer-events-none flex items-center justify-center overflow-hidden opacity-[0.15] md:pl-64">
                <Image src="/VisayasMedical.png" alt="Background Logo Watermark" width={600} height={600} className="object-contain" priority />
            </div>

            {/* Sidebar Overlay for Mobile */}
            {isSidebarOpen && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar Navigation */}
            <aside className={`
                fixed md:sticky top-0 left-0 z-50 h-[100dvh] w-64 bg-brand-dark-blue text-white shadow-xl transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                flex flex-col
            `}>
                {/* Sidebar Header */}
                <div className="flex items-center justify-between h-16 md:h-20 px-6 border-b border-brand-light-grey/20 shrink-0">
                    <Link href="/quotation" className="flex items-center gap-3">
                        <div className="bg-white p-1 rounded-lg">
                            <Image src="/VisayasMedical.png" alt="Logo" width={28} height={28} className="object-contain" />
                        </div>
                        <span className="font-bold text-lg tracking-tight leading-tight">
                            VisayasMed<br /><span className="text-brand-light-grey text-sm font-medium">Hospital</span>
                        </span>
                    </Link>
                    <button
                        className="md:hidden p-1.5 text-brand-light-grey hover:text-white rounded-md hover:bg-white/10"
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Sidebar Main Links */}
                <div className="flex-1 py-6 px-4 overflow-y-auto">
                    <div className="text-xs font-semibold text-brand-muted-blue tracking-wider mb-3 px-2 uppercase">Menu</div>
                    <nav className="space-y-1.5">
                        {navTabs.map(tab => {
                            const active = pathname === tab.href || pathname.startsWith(tab.href + '/');
                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${active
                                        ? 'bg-brand-muted-blue text-white shadow-md'
                                        : 'text-brand-light-grey hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <div className={`${active ? 'text-white' : 'text-brand-light-grey group-hover:text-white'}`}>
                                        {tab.icon}
                                    </div>
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Sidebar Footer (User Info) */}
                <div className="p-4 border-t border-brand-light-grey/20 bg-black/10 shrink-0">
                    {user && (
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-9 h-9 rounded-full bg-brand-muted-blue flex items-center justify-center text-sm font-bold shadow-sm ring-2 ring-white/10 shrink-0">
                                {user.FirstName[0]}{user.LastName[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-semibold truncate leading-tight text-white mb-0.5">{user.FirstName} {user.LastName}</div>
                                <div className="text-[11px] font-medium text-brand-lime-green uppercase tracking-wider truncate">{user.RoleName}</div>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content Area Container */}
            <div className="flex-1 flex flex-col min-w-0 relative z-10 w-full h-[100dvh] overflow-y-auto">

                {/* Unified Top Header (Desktop & Mobile) */}
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200 h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 shadow-sm">
                    {/* Mobile Left: Hamburger + Logo */}
                    <div className="flex md:hidden items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <Image src="/VisayasMedical.png" alt="Logo" width={28} height={28} className="object-contain" />
                        <span className="font-bold text-lg tracking-tight text-slate-800">
                            VisayasMed
                        </span>
                    </div>

                    {/* Desktop Left: Context / Path */}
                    <div className="hidden md:flex items-center text-sm font-medium text-slate-500">
                        {pageTitle}
                    </div>

                    {/* Right: Logout Only */}
                    <div className="flex items-center gap-4">
                        <button
                            className="flex items-center gap-2 text-sm font-medium bg-white text-slate-700 hover:bg-brand-bright-red/10 hover:text-brand-bright-red hover:border-brand-bright-red/30 border border-slate-200 transition-all px-3 py-1.5 rounded-lg shadow-sm"
                            onClick={logout}
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </header>

                {/* Main Content Body */}
                <main className="flex-1 flex flex-col min-w-0 relative">
                    {children}

                    {/* Footer */}
                    <footer className="mt-auto py-6 text-center text-sm text-slate-500 border-t border-slate-200 bg-white/80 shrink-0 relative z-10">
                        © {new Date().getFullYear()} VisayasMed Hospital · All rights reserved
                    </footer>
                </main>
            </div>
        </div>
    );
}
