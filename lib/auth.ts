// ============================================================
//  VisayasMed — Auth Library (Firebase Auth)
//  Replaces the old cookie-based auth system
// ============================================================

import { auth } from '@/lib/firebase';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User,
} from 'firebase/auth';

/**
 * Login with Firebase email/password.
 * On success: gets ID token → POSTs to /api/auth/session (sets HttpOnly cookie).
 * @param rememberMe - If true, session persists for 14 days instead of 8 hours
 */
export async function loginWithFirebase(email: string, password: string, rememberMe: boolean = false): Promise<void> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();

    const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, rememberMe }),
    });

    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to establish session.');
    }
}

/**
 * Logout — signs out of Firebase and clears HttpOnly cookie.
 */
export async function logoutFirebase(): Promise<void> {
    await signOut(auth);
    await fetch('/api/auth/logout', { method: 'POST' });
}

export { onAuthStateChanged };
export type { User };
