'use client';

// ============================================================
//  VisayasMed — Auth Context
//  Provides: user, roleName, permissions (resolved RBAC), loading
//  Wraps the entire app — consumes /api/auth/me
// ============================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { logoutUser } from '@/lib/auth';

interface AuthUser {
    UserID: string;
    Email: string;
    FirstName: string;
    LastName: string;
    RoleID: string;
    RoleName: string;
    DepartmentID?: string;
    DepartmentName?: string;
    Permissions: any; // Keep generic or import if needed
}

interface AuthContextValue {
    user: AuthUser | null;
    loading: boolean;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    loading: true,
    logout: async () => { },
    refreshUser: async () => { },
});

export function AuthProvider({ children, initialUser }: { children: React.ReactNode, initialUser?: any }) {
    const [user, setUser] = useState<AuthUser | null>(initialUser || null);
    const [loading, setLoading] = useState<boolean>(!initialUser);

    const fetchMe = useCallback(async () => {
        try {
            const res = await fetch(`/api/auth/me?t=${Date.now()}`, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            if (res.ok) {
                const data = await res.json();
                
                if (data.sessionInvalidated) {
                    console.warn('[AuthContext] Session invalidated from another device. Logging out...');
                    await logoutUser();
                    setUser(null);
                    window.location.href = '/login?reason=session_invalidated';
                    return;
                }

                if (data.authenticated === false || data.error) {
                    setUser(null);
                    setLoading(false);
                    // Prevent infinite redirect loop if already on login page
                    if (window.location.pathname !== '/login') {
                        await logoutUser();
                        window.location.href = '/login?reason=unauthorized';
                    }
                } else {
                    setUser(data);
                }
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch on mount if no initialUser
    useEffect(() => {
        if (!initialUser) {
            fetchMe();
        }
    }, [fetchMe, initialUser]);

    const logout = async () => {
        await logoutUser();
        setUser(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout, refreshUser: fetchMe }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
