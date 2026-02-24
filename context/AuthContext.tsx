'use client';

// ============================================================
//  VisayasMed — Auth Context
//  Provides: user, roleName, permissions (resolved RBAC), loading
//  Wraps the entire app — consumes /api/auth/me
// ============================================================

import React, { createContext, useContext, useEffect, useState } from 'react';
import { logoutFirebase } from '@/lib/auth';
import type { ResolvedPermissions } from '@/lib/firestore/permissions';

interface AuthUser {
    UserID: string;
    Email: string;
    FirstName: string;
    LastName: string;
    RoleID: string;
    RoleName: string;
    Permissions: ResolvedPermissions;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchMe = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            } else {
                // Fail-secure: any error means not authenticated
                setUser(null);
            }
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMe();
    }, []);

    const logout = async () => {
        await logoutFirebase();
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
