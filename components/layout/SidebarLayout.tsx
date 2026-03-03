'use client';

import { useState, useEffect } from 'react';
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
    Shield,
    Box
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
    'LayoutDashboard': LayoutDashboard,
    'ClipboardList': ClipboardList,
    'History': History,
    'Building2': Building2,
    'Stethoscope': Stethoscope,
    'Users': Users,
    'Shield': Shield
};

interface AppModule {
    ModuleID: string;
    ModuleName: string;
    Label: string;
    Path: string;
    Icon: string;
    SortOrder: number;
    IsActive: boolean;
}

interface SidebarLayoutProps {
    children: React.ReactNode;
    pageTitle?: string;
}

export default function SidebarLayout({ children, pageTitle = 'Quotation System' }: SidebarLayoutProps) {
    const { user, loading, logout } = useAuth();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [modules, setModules] = useState<AppModule[]>([]);
    const [modulesLoading, setModulesLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        fetch('/api/modules')
            .then(res => res.json())
            .then(data => {
                if (isMounted && data.success) {
                    setModules(data.modules || []);
                }
            })
            .catch(err => console.error("Failed to fetch modules for sidebar", err))
            .finally(() => {
                if (isMounted) setModulesLoading(false);
            });

        return () => { isMounted = false; };
    }, []);

    // Build navigation tabs dynamically
    const navTabs = modules
        .filter(mod => {
            // First two (Quotations, History) historically might be public to all users, 
            // but the prompt specified: "Only modules with CanView === true for the active user will be displayed."
            // So we strictly enforce CanView for everything.
            return user?.Permissions?.[mod.ModuleName]?.CanView === true;
        })
        .map(mod => {
            const IconComp = ICON_MAP[mod.Icon] || Box; // Fallback to Box icon
            return {
                href: mod.Path,
                label: mod.Label,
                icon: <IconComp className="w-4 h-4" />
            };
        });

    if (loading || modulesLoading) {
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
                fixed md:sticky top-0 left-0 z-50 h-[100dvh] w-64 bg-[#234b8c] text-white shadow-xl transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                flex flex-col relative
            `}>
                {/* Subtle overlay to soften the blue without losing it */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10 pointer-events-none" />

                {/* Sidebar Header */}
                <div className="flex items-center justify-between h-16 md:h-20 px-6 border-b border-white/10 shrink-0 relative z-10">
                    <Link href="/quotation" className="flex items-center gap-3">
                        <Image src="/VisayasMedical.png" alt="Logo" width={40} height={40} className="object-contain" priority />
                        <span className="font-bold text-lg tracking-tight leading-tight">
                            VisayasMed<br /><span className="text-blue-100/80 text-sm font-medium">Hospital</span>
                        </span>
                    </Link>
                    <button
                        className="md:hidden p-1.5 text-blue-200 hover:text-white rounded-md hover:bg-white/10"
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Sidebar Main Links */}
                <div className="flex-1 py-6 px-4 overflow-y-auto relative z-10">
                    <div className="text-xs font-semibold text-blue-200/60 tracking-wider mb-3 px-2 uppercase">Menu</div>
                    <nav className="space-y-1.5">
                        {navTabs.map(tab => {
                            const active = pathname === tab.href || pathname.startsWith(tab.href + '/');
                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${active
                                        ? 'bg-white/15 text-white shadow-md border border-white/5'
                                        : 'text-blue-100/70 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <div className={`${active ? 'text-white' : 'text-blue-200/50 group-hover:text-white transition-colors'}`}>
                                        {tab.icon}
                                    </div>
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Sidebar Footer (User Info) */}
                <div className="p-4 border-t border-white/10 bg-black/10 shrink-0 relative z-10">
                    {user && (
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-sm font-bold shadow-sm ring-2 ring-white/10 shrink-0 border border-white/5">
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
                        <Image src="/VisayasMedical.png" alt="Logo" width={32} height={32} className="object-contain" priority />
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
