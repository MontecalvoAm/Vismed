// ============================================================
//  VisayasMed — Firebase App Initializer
//  Exports: db (Firestore), auth (Firebase Auth), generateUUIDv7
// ============================================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Singleton pattern — prevent re-initialization during hot reload
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// Set persistence to LOCAL so session survives browser restart
// This stores the auth state in localStorage (persist across sessions)
if (typeof window !== 'undefined') {
    setPersistence(auth, browserLocalPersistence);
}

/**
 * Generates a UUID v7 string (time-sortable).
 * Per backend-visayasmed skill: all document IDs must be UUID v7.
 */
export function generateUUIDv7(): string {
    // Get current timestamp in milliseconds
    const now = Date.now();
    const ms = BigInt(now);

    // Build UUID v7 bytes
    const bytes = new Uint8Array(16);
    // Bytes 0–5: 48-bit big-endian timestamp
    bytes[0] = Number((ms >> 40n) & 0xffn);
    bytes[1] = Number((ms >> 32n) & 0xffn);
    bytes[2] = Number((ms >> 24n) & 0xffn);
    bytes[3] = Number((ms >> 16n) & 0xffn);
    bytes[4] = Number((ms >> 8n) & 0xffn);
    bytes[5] = Number(ms & 0xffn);

    // Bytes 6–15: random
    crypto.getRandomValues(bytes.subarray(6));

    // Set version 7
    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    // Set variant (10xx)
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    // Format as UUID string
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
