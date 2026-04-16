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
    Box,
    ChevronDown,
    ChevronRight,
    Archive,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
    'LayoutDashboard': LayoutDashboard,
    'ClipboardList': ClipboardList,
    'History': History,
    'Building2': Building2,
    'Stethoscope': Stethoscope,
    'Users': Users,
    'Shield': Shield,
    'Archive': Archive,
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
    const [isReportsOpen, setIsReportsOpen] = useState(pathname.startsWith('/reports'));
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

    const [modules, setModules] = useState<AppModule[]>([]);
    const [modulesLoading, setModulesLoading] = useState(true);

    // Close user dropdown if clicked outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('#user-dropdown-container')) {
                setIsUserDropdownOpen(false);
            }
        };

        if (isUserDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isUserDropdownOpen]);

    useEffect(() => {
        let isMounted = true;
        const cachedModules = typeof window !== 'undefined' ? sessionStorage.getItem('vm_modules') : null;

        if (cachedModules) {
            setModules(JSON.parse(cachedModules));
            setModulesLoading(false);
        }

        fetch('/api/modules')
            .then(res => res.json())
            .then(data => {
                if (isMounted && data.success) {
                    setModules(data.modules || []);
                    sessionStorage.setItem('vm_modules', JSON.stringify(data.modules || []));
                }
            })
            .catch(err => console.error("Failed to fetch modules for sidebar", err))
            .finally(() => {
                if (isMounted && !cachedModules) setModulesLoading(false);
            });

        return () => { isMounted = false; };
    }, []);

    // Build navigation tabs dynamically
    const rawTabs = modules
        .filter(mod => user?.Permissions?.[mod.ModuleName]?.CanView === true)
        .map(mod => {
            const IconComp = ICON_MAP[mod.Icon] || Box;
            return {
                id: mod.ModuleID,
                href: mod.Path,
                label: mod.Label,
                icon: <IconComp className="w-4 h-4" />
            };
        });

    const navItems: any[] = [];
    const reportGroup: any = {
        label: 'Reports',
        icon: <ClipboardList className="w-4 h-4" />,
        isGroup: true,
        children: []
    };

    rawTabs.forEach(tab => {
        if (tab.id === 'reports' || tab.id === 'logs') {
            reportGroup.children.push(tab);
        } else {
            navItems.push(tab);
        }
    });

    if (reportGroup.children.length > 0) {
        const insertIndex = rawTabs.findIndex(t => t.id === 'reports' || t.id === 'logs');
        if (insertIndex !== -1) {
            navItems.splice(insertIndex, 0, reportGroup);
        } else {
            navItems.push(reportGroup);
        }
    }

    if (loading || modulesLoading) {
        return (
            <div className="min-h-screen flex text-slate-900 bg-brand-light-grey/20">
                {/* Sidebar Skeleton */}
                <aside className="hidden md:flex flex-col w-64 bg-[#234b8c] text-white shrink-0 relative overflow-hidden">
                    <div className="h-20 px-6 border-b border-white/10 flex items-center shrink-0">
                        <div className="w-10 h-10 rounded-lg bg-white/10 animate-pulse" />
                        <div className="ml-3 h-4 w-24 bg-white/10 rounded animate-pulse" />
                    </div>
                    <div className="flex-1 py-6 px-4 space-y-3">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="w-full h-10 rounded-xl bg-white/5 animate-pulse" />
                        ))}
                    </div>
                </aside>

                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header Skeleton */}
                    <header className="h-16 border-b border-slate-200 bg-white/50 flex items-center justify-between px-4 sm:px-6">
                        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse hidden md:block" />
                        <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse ml-auto" />
                    </header>
                    <main className="flex-1 p-8">
                        <div className="h-32 bg-slate-100 rounded-2xl animate-pulse mb-6" />
                        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative bg-brand-light-grey/20 text-slate-900 flex font-sans">
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
                flex flex-col
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
                        {navItems.map((item, idx) => {
                            if (item.isGroup) {
                                const activeChild = item.children.some((c: any) => pathname === c.href || pathname.startsWith(c.href + '/'));
                                return (
                                    <div key={item.label} className="space-y-1">
                                        <button
                                            onClick={() => setIsReportsOpen(!isReportsOpen)}
                                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeChild || isReportsOpen
                                                ? 'bg-white/10 text-white'
                                                : 'text-blue-100/70 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`${activeChild || isReportsOpen ? 'text-white' : 'text-blue-200/50 group-hover:text-white transition-colors'}`}>
                                                    {item.icon}
                                                </div>
                                                {item.label}
                                            </div>
                                            {isReportsOpen ? <ChevronDown className="w-4 h-4 text-blue-200/50" /> : <ChevronRight className="w-4 h-4 text-blue-200/50" />}
                                        </button>

                                        {isReportsOpen && (
                                            <div className="pl-10 pr-2 space-y-1 mt-1">
                                                {item.children.map((child: any) => {
                                                    const childActive = pathname === child.href;
                                                    return (
                                                        <Link
                                                            key={child.href}
                                                            href={child.href}
                                                            onClick={() => setIsSidebarOpen(false)}
                                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${childActive
                                                                ? 'bg-brand-lime-green/20 text-brand-lime-green shadow-sm border border-brand-lime-green/10'
                                                                : 'text-blue-100/70 hover:text-white hover:bg-white/5'
                                                                }`}
                                                        >
                                                            <div className={`${childActive ? 'text-brand-lime-green' : 'text-blue-200/50 group-hover:text-white transition-colors'}`}>
                                                                {child.icon}
                                                            </div>
                                                            {child.label}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            const active = pathname === item.href || pathname.startsWith(item.href + '/');
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${active
                                        ? 'bg-white/15 text-white shadow-md border border-white/5'
                                        : 'text-blue-100/70 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <div className={`${active ? 'text-white' : 'text-blue-200/50 group-hover:text-white transition-colors'}`}>
                                        {item.icon}
                                    </div>
                                    {item.label}
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

                    {/* Right: User Dropdown */}
                    <div className="flex items-center gap-4 relative" id="user-dropdown-container">
                        <div className="relative">
                            <button
                                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                className="flex items-center gap-2 text-sm font-medium bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 transition-all px-2 py-1.5 rounded-lg shadow-sm"
                            >
                                <div className="w-8 h-8 rounded-full bg-brand-lime-green/20 text-brand-lime-green flex items-center justify-center text-sm font-bold shrink-0">
                                    {user?.FirstName?.[0] || ''}{user?.LastName?.[0] || ''}
                                </div>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Menu Overlay */}
                            {isUserDropdownOpen && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-4 py-3 border-b border-slate-100">
                                        <p className="text-sm font-semibold text-slate-800 truncate">
                                            {user?.FirstName || ''} {user?.LastName || ''}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate mt-0.5">
                                            {user?.RoleName || 'User'}
                                        </p>
                                    </div>
                                    <div className="p-1.5 space-y-1">
                                        <Link
                                            href="/settings"
                                            onClick={() => setIsUserDropdownOpen(false)}
                                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors w-full text-left"
                                        >
                                            <div className="bg-slate-100 p-1.5 rounded-md text-slate-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                                            </div>
                                            Settings
                                        </Link>
                                        <div className="h-px bg-slate-100 my-1 mx-2" />
                                        <button
                                            onClick={logout}
                                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-brand-bright-red hover:bg-red-50 rounded-lg transition-colors w-full text-left"
                                        >
                                            <div className="bg-red-100 p-1.5 rounded-md">
                                                <LogOut className="w-3.5 h-3.5" />
                                            </div>
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
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
