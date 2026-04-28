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
    console.error("❌ Firebase Messaging not initialized.");
    return false;
  }
  return true;
};

// --- DOCTOR CALLS THIS ON LOGIN ---
router.post('/save-doctor-token', authenticate, async (req: any, res: Response) => {
  const { token } = req.body;
  
  // Extract UUID safely from JWT payload
  const doctorId = req.user?.doctorId || req.user?.id || req.user?.userId;

  console.log(`[DEBUG] Saving FCM token for UUID: ${doctorId}`);

  if (!doctorId || typeof doctorId !== 'string') {
    return res.status(401).json({ 
      error: "Unauthorized", 
      details: "Valid UUID not found in token." 
    });
  }

  if (!token) {
    return res.status(400).json({ error: "Missing FCM token." });
  }

  try {
    // Perform update using the UUID string
    const result = await db.update(doctors)
      .set({ fcmToken: token })
      .where(eq(doctors.id, doctorId)); 

    return res.json({ success: true, message: "Token saved." });
  } catch (err: any) {
    console.error("❌ DB UPDATE ERROR:", err.message);
    return res.status(500).json({ 
      error: "Database error", 
      details: err.message 
    });
  }
});

// --- PATIENT CALLS THIS TO START THE CALL ---
router.post('/alert-doctor', authenticate, async (req: any, res: Response) => {
  const { doctorId, patientName, vitalsId } = req.body;

  if (!isMessagingReady()) {
    return res.status(503).json({ error: "Notification service offline." });
  }

  try {
    // Ensure doctorId is treated as a string for UUID comparison
    const [doctor] = await db.select()
      .from(doctors)
      .where(eq(doctors.id, String(doctorId)))
      .limit(1);

    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found." });
    }

    if (!doctor.fcmToken) {
      return res.status(400).json({ error: "Doctor has no active FCM token." });
    }

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

    await messaging.send(message);
    return res.json({ success: true, message: "Doctor notified." });

  } catch (err: any) {
    console.error("❌ FCM ALERT ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;