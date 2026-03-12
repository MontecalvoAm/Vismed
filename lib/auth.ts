/**
 * Login with Email/Password (MySQL-based).
 * POSTs to /api/auth/session (sets HttpOnly cookie).
 * @param rememberMe - If true, session persists for 14 days instead of 8 hours
 */
export async function loginUser(email: string, password: string, rememberMe: boolean = false): Promise<void> {
    const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe, isLogin: true }),
    });

    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to establish session.');
    }
}

/**
 * Logout — clears HttpOnly cookie.
 */
export async function logoutUser(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
}
