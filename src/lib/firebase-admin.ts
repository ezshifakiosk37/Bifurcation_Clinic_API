import * as admin from 'firebase-admin';

// 1. Log the status to Vercel (This will show up in your "Logs" tab)
console.log("Checking Firebase Environment Variables...");

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // This is the most common crash point:
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

let messagingInstance: any = null;

if (!admin.apps.length) {
  // Check if any critical piece is missing before trying to initialize
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.error("❌ CRITICAL: Firebase Admin variables are missing or malformed.");
    // We do NOT call initializeApp here to prevent the crash
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("✅ Firebase Admin Initialized Successfully");
      messagingInstance = admin.messaging();
    } catch (error: any) {
      console.error("❌ Firebase Admin Init Error:", error.message);
    }
  }
} else {
  messagingInstance = admin.messaging();
}

// Export a proxy or a check to prevent crashing routes that use this
export const messaging = messagingInstance;