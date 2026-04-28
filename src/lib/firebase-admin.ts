import * as admin from 'firebase-admin';

// 1. Validation Check: If these are missing, the server will crash on start
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!admin.apps.length) {
  if (!projectId || !clientEmail || !privateKey) {
    console.error("❌ CRITICAL: Firebase Admin variables are missing in Vercel Settings.");
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          // Replace escaped newlines if they exist
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      console.log("✅ Firebase Admin initialized successfully");
    } catch (error) {
      console.error("❌ Firebase Admin initialization failed:", error);
    }
  }
}

// 2. Export a getter or the instance
// Using messaging() directly here is fine as long as initializeApp didn't throw
export const messaging = admin.messaging();