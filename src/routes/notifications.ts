import { Router } from 'express';
import { db } from '../db';
import { doctors } from '../db/schema';
import { eq } from 'drizzle-orm';
import { messaging } from '../lib/firebase-admin'; 
import { authenticate } from '../middleware/auth';

const router = Router();

// --- DOCTOR CALLS THIS ON LOGIN ---
router.post('/save-doctor-token', authenticate, async (req: any, res) => {
  const { token } = req.body;
  const doctorId = req.user.doctorId; // Matching your docAuth.ts JWT payload

  try {
    await db.update(doctors)
      .set({ fcmToken: token })
      .where(eq(doctors.id, doctorId));

    res.json({ success: true, message: "Doctor's notification token saved." });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// --- PATIENT CALLS THIS TO START THE CALL ---
router.post('/alert-doctor', authenticate, async (req: any, res) => {
  const { doctorId, patientName, vitalsId } = req.body;

  try {
    // 1. Find the doctor the patient is trying to reach
    const [doctor] = await db.select().from(doctors).where(eq(doctors.id, doctorId)).limit(1);

    if (!doctor || !doctor.fcmToken) {
      return res.status(404).json({ error: "Doctor is not available for notifications." });
    }

    // 2. Send the Push
    const message = {
      notification: {
        title: "New Patient Calling",
        body: `${patientName} is requesting a video consultation.`,
      },
      data: {
        type: "INCOMING_CALL",
        vitalsId: String(vitalsId),
        click_action: `/doctor/dashboard/call/${vitalsId}` // URL for the Doctor
      },
      token: doctor.fcmToken,
    };

    await messaging.send(message);
    res.json({ success: true, message: "Doctor notified." });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;