const fs = require('fs');
const admin = require('firebase-admin');

// Manually parse .env
const env = fs.readFileSync('.env', 'utf8');
const base64Match = env.match(/FIREBASE_SERVICE_ACCOUNT_BASE64=(.*)/);
const base64 = base64Match ? base64Match[1].trim() : null;

async function test() {
    console.log("Base64 string length:", base64 ? base64.length : "MISSING");

    if (!base64) {
        console.error("No FIREBASE_SERVICE_ACCOUNT_BASE64 found in .env");
        process.exit(1);
    }

    try {
        const decoded = Buffer.from(base64, 'base64').toString('utf8');
        const serviceAccount = JSON.parse(decoded);
        console.log("Parsed project id:", serviceAccount.project_id);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        const auth = admin.auth();
        const db = admin.firestore();

        console.log("Testing Firestore connection...");
        const snap = await db.collection('M_Role').limit(1).get();
        console.log("Success! Found", snap.size, "roles.");
        process.exit(0);
    } catch (e) {
        console.error("Failed!", e);
        process.exit(1);
    }
}

test();
