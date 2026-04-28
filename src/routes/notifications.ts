import { Router, Request, Response } from 'express';
import { db } from '../db';
import { doctors } from '../db/schema';
import { eq } from 'drizzle-orm';
import { messaging } from '../lib/firebase-admin'; 
import { authenticate } from '../middleware/auth';

const router = Router();

// Helper to check if messaging is alive
const isMessagingReady = () => {
  if (!messaging) {
    console.error("❌ Firebase Messaging is not initialized. Check your Environment Variables.");
    return false;
  }
  return true;
};

// --- DOCTOR CALLS THIS ON LOGIN ---
router.post('/save-doctor-token', authenticate, async (req: any, res: Response) => {
  const { token } = req.body;
  const doctorId = req.user?.doctorId || req.user?.id; // Guard against different JWT payloads

  if (!token) {
    return res.status(400).json({ error: "Missing FCM token in request body." });
  }

  try {
    await db.update(doctors)
      .set({ fcmToken: token })
      .where(eq(doctors.id, doctorId));

    return res.json({ success: true, message: "Doctor's notification token saved." });
  } catch (err: any) {
    console.error("Database Error:", err.message);
    return res.status(500).json({ error: "Database error" });
  }
});

// --- PATIENT CALLS THIS TO START THE CALL ---
router.post('/alert-doctor', authenticate, async (req: any, res: Response) => {
  const { doctorId, patientName, vitalsId } = req.body;

  // 1. Check if Firebase is actually working
  if (!isMessagingReady()) {
    return res.status(503).json({ error: "Notification service is currently unavailable (Firebase Init Failed)." });
  }

  try {
    // 2. Find the doctor
    const [doctor] = await db.select().from(doctors).where(eq(doctors.id, doctorId)).limit(1);

    if (!doctor || !doctor.fcmToken) {
      return res.status(404).json({ error: "Doctor is not registered for push notifications." });
    }

    // 3. Construct Message
    const message = {
      notification: {
        title: "New Patient Calling",
        body: `${patientName || 'A patient'} is requesting a video consultation.`,
      },
      data: {
        type: "INCOMING_CALL",
        vitalsId: String(vitalsId),
        click_action: `/doctor/dashboard/call/${vitalsId}` 
      },
      token: doctor.fcmToken,
    };

    // 4. Send the Push
    await messaging.send(message);
    return res.json({ success: true, message: "Doctor notified." });

  } catch (err: any) {
    console.error("FCM Send Error:", err.message);
    return res.status(500).json({ error: `Notification failed: ${err.message}` });
  }
});

export default router;