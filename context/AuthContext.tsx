'use client';

// ============================================================
//  VisayasMed — Auth Context
//  Provides: user, roleName, permissions (resolved RBAC), loading
//  Wraps the entire app — consumes /api/auth/me
//  Includes automatic token refresh mechanism
// ============================================================

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { logoutFirebase } from '@/lib/auth';
import { auth } from '@/lib/firebase';
import { onIdTokenChanged, type User as FirebaseUser } from 'firebase/auth';
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

// Token refresh interval: check every 5 minutes
const TOKEN_CHECK_INTERVAL = 5 * 60 * 1000;
// Refresh token 5 minutes before expiration
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    // Optimistic: if there's no token cookie at all, we know immediately the user
    // isn't logged in — no need to wait for /api/auth/me to confirm.
    const [loading, setLoading] = useState<boolean>(() => {
        if (typeof document !== 'undefined') {
            return document.cookie.includes('vm_token');
        }
        return true; // SSR: default to loading until hydration
    });
    const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchMe = async (retryCount = 0) => {
        const MAX_RETRIES = 1;

        try {
            const res = await fetch('/api/auth/me', {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            if (res.ok) {
                const data = await res.json();
                console.log("[AuthContext] LIVE Current Permissions loaded:", data.Permissions);

                // If token is expired, force refresh and retry once
                if (data.tokenExpired && auth.currentUser && retryCount < MAX_RETRIES) {
                    console.log('[AuthContext] Token expired, refreshing...');
                    try {
                        const idToken = await auth.currentUser.getIdToken(true);
                        await fetch('/api/auth/session', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ idToken }),
                        });
                        // Retry fetchMe after refresh
                        return fetchMe(retryCount + 1);
                    } catch (refreshErr) {
                        console.error('[AuthContext] Failed to refresh expired token:', refreshErr);
                        setUser(null);
                        return;
                    }
                }

                if (data.authenticated === false || data.error) {
                    setUser(null);
                } else {
                    setUser(data);
                }
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

    // Refresh the session cookie with a new token
    const refreshSession = useCallback(async (firebaseUser: FirebaseUser) => {
        try {
            const idToken = await firebaseUser.getIdToken(true); // Force refresh
            const res = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });

            if (!res.ok) {
                console.error('[AuthContext] Failed to refresh session');
            }
        } catch (error) {
            console.error('[AuthContext] Token refresh error:', error);
        }
    }, []);

    // Check token expiration and refresh if needed
    const checkAndRefreshToken = useCallback(async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        try {
            const idTokenResult = await currentUser.getIdTokenResult();
            const expirationTime = new Date(idTokenResult.expirationTime).getTime();
            const now = Date.now();
            const timeUntilExpiry = expirationTime - now;

            // Refresh if token expires within the buffer period
            if (timeUntilExpiry < TOKEN_REFRESH_BUFFER) {
                console.log('[AuthContext] Token expiring soon, refreshing...');
                await refreshSession(currentUser);
            }
        } catch (error) {
            console.error('[AuthContext] Token check error:', error);
        }
    }, [refreshSession]);

    // Listen for Firebase auth state changes
    useEffect(() => {
        const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Get a fresh token and update the cookie BEFORE fetching user data
                // This ensures the server has a valid token when /api/auth/me is called
                try {
                    const idToken = await firebaseUser.getIdToken();
                    await fetch('/api/auth/session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ idToken }),
                    });
                } catch (err) {
                    console.error('[AuthContext] Failed to update session cookie:', err);
                }

                // Now fetch user data with the updated cookie
                await fetchMe();
            } else {
                // User is signed out
                setUser(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    // Set up token refresh interval
    useEffect(() => {
        if (user) {
            // Clear any existing interval
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }

            // Check token every 5 minutes
            refreshIntervalRef.current = setInterval(checkAndRefreshToken, TOKEN_CHECK_INTERVAL);

            // Also check immediately
            checkAndRefreshToken();
        }

        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
                refreshIntervalRef.current = null;
            }
        };
    }, [user, checkAndRefreshToken]);

    const logout = async () => {
        // Clear refresh interval
        if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
            refreshIntervalRef.current = null;
        }

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
