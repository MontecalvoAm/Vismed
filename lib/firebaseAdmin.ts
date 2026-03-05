// ============================================================
//  VisayasMed — Firebase Admin SDK (server-side only)
//  Initializes using environment variables instead of a
//  service account file, so it works without extra credentials.
//  WARNING: Never import this in client components.
// ============================================================

import * as admin from 'firebase-admin';

const globalAny: any = global;

if (!globalAny.adminAppsInitialized) {
    const base64Credentials = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    console.log("[FirebaseAdmin] Initialization started...");

    let initialized = false;

    if (base64Credentials && !admin.apps.length) {
        try {
            console.log("[FirebaseAdmin] Found base64Credentials layout, length:", base64Credentials.length);
            const decodedCredentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
            const serviceAccount = JSON.parse(decodedCredentials);
            console.log("[FirebaseAdmin] Successfully parsed service account for project:", serviceAccount.project_id);

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            });
            console.log("[FirebaseAdmin] Initialized WITH credentials.");
            initialized = true;
        } catch (error: any) {
            console.error("[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64:", error.message);
        }
    }

    if (!initialized && !admin.apps.length) {
        console.log("[FirebaseAdmin] No base64Credentials or parsing failed, using simple project fallback.");
        // Development fallback: project-only init
        admin.initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
    } else {
        console.log("[FirebaseAdmin] App already initialized by length checks.");
    }

    // Cache the instances to survive Next.js Fast Refresh
    globalAny.adminAuthCached = admin.auth();
    globalAny.adminDbCached = admin.firestore();

    // WARNING: Next.js HMR (Fast Refresh) routinely destroys the default GRPC channels 
    // that Firestore uses. We MUST force HTTP/REST transport, otherwise every hot reload 
    // will leave broken, zombie connections that throw `16 UNAUTHENTICATED` or timeout.
    globalAny.adminDbCached.settings({ preferRest: true });

    globalAny.adminAppsInitialized = true;
    console.log("[FirebaseAdmin] Set up global firestore instances (preferRest: true).");
} else {
    console.log("[FirebaseAdmin] Reusing cached Next.js HMR globals.");
}

export const adminAuth = globalAny.adminAuthCached;
export const adminDb = globalAny.adminDbCached;
