// ============================================================
//  VisayasMed — Firebase Admin SDK (server-side only)
//  Initializes using environment variables instead of a
//  service account file, so it works without extra credentials.
//  WARNING: Never import this in client components.
// ============================================================

import * as admin from 'firebase-admin';

// Prevent re-initialization across Next.js hot-reloads
if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;

    if (privateKey && process.env.FIREBASE_CLIENT_EMAIL) {
        // Production: full service account credentials
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey,
            }),
        });
    } else {
        // Development fallback: project-only init (Firestore reads allowed by open rules)
        admin.initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
    }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
