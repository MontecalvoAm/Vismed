/**
 * Simple auth helper for VisMed QuotationApp.
 * Uses a cookie named "vm_session" to track login state.
 */

const SESSION_COOKIE = 'vm_session';
const SESSION_VALUE = 'authenticated';

// Valid credentials (can be expanded to a JSON list later)
const VALID_USERS = [
    { username: 'admin', password: 'vismed2024' },
    { username: 'billing', password: 'vismed2024' },
];

/**
 * Check credentials. Returns true if valid.
 * @param {string} username
 * @param {string} password
 */
export function checkCredentials(username, password) {
    return VALID_USERS.some(
        (u) => u.username === username.trim().toLowerCase() && u.password === password
    );
}

/**
 * Set session cookie (client-side).
 * Uses a simple non-httpOnly cookie so middleware can read it.
 */
export function setSession() {
    const expires = new Date();
    expires.setHours(expires.getHours() + 8); // 8-hour session
    document.cookie = `${SESSION_COOKIE}=${SESSION_VALUE}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}

/**
 * Clear session cookie (client-side logout).
 */
export function clearSession() {
    document.cookie = `${SESSION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

/**
 * Check if session cookie is present (client-side).
 */
export function isAuthenticated() {
    if (typeof document === 'undefined') return false;
    return document.cookie.split(';').some((c) => c.trim().startsWith(`${SESSION_COOKIE}=`));
}

export { SESSION_COOKIE, SESSION_VALUE };
