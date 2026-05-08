import { Router, Request, Response } from 'express';
import { db } from '../db';
import { all_entries, doctors, vitals } from '../db/schema';
import { eq } from 'drizzle-orm';
import { messaging } from '../lib/firebase-admin';
import { authenticate } from '../middleware/auth';
import { authenticateDoctor } from './doctors';

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
    console.log('RAW BODY:', JSON.stringify(req.body)); // ← add this
    console.log('FULL BODY:', req.body);           // ← add this
    console.log('AUTH HEADER:', req.headers.authorization);
    const { token } = req.body;
    console.log('TOKEN AFTER DESTRUCTURE:', token);

    const doctorId = req.user?.doctorId || req.user?.id || req.user?.userId;

    console.log(`[DEBUG] Doctor ID: ${doctorId}`);
    console.log("🔥 RECEIVED TOKEN:", token);

    // notifications.ts — save-doctor-token route
    if (!token || typeof token !== 'string' || token.trim() === '' || token === 'undefined') {
        return res.status(400).json({ error: "Missing or invalid FCM token." });
    }

    if (!doctorId || typeof doctorId !== 'string') {
        return res.status(401).json({
            error: "Unauthorized",
            details: "Valid UUID not found in token."
        });
    }

    if (!token || token.length < 100) {
        return res.status(400).json({
            error: "Invalid FCM token received"
        });
    }

    try {
        await db.update(doctors)
            .set({ fcmToken:token })
            .where(eq(doctors.id, doctorId));

        console.log("✅ Token saved in DB");

        return res.json({ success: true });

    } catch (err: any) {
        console.error("❌ DB ERROR:", err.message);
        return res.status(500).json({
            error: "Database error",
            details: err.message
        });
    }
});

// --- PATIENT CALLS THIS TO START THE CALL ---
router.post('/alert-doctor', authenticateDoctor, async (req: any, res: Response) => {
    const { doctorId, vitalsId } = req.body;

    if (!isMessagingReady()) {
        return res.status(503).json({ error: "Notification service offline." });
    }

    try {
        // 1. Fetch the Doctor
        const [doctor] = await db.select()
            .from(doctors)
            .where(eq(doctors.id, String(doctorId)))
            .limit(1);

        if (!doctor) return res.status(404).json({ error: "Doctor not found." });
        if (!doctor.fcmToken) return res.status(400).json({ error: "Doctor has no active FCM token." });

        // 2. Fetch Patient Name + Token
        const [patientData] = await db.select({
            firstName: all_entries.firstName,
            lastName: all_entries.lastName,
            token: vitals.token,           // ✅ grab token from vitals
        })
            .from(vitals)
            .innerJoin(all_entries, eq(vitals.patient_id, all_entries.id))
            .where(eq(vitals.id, String(vitalsId)))
            .limit(1);

        const displayName = patientData
            ? `${patientData.firstName} ${patientData.lastName}`
            : "A patient";

        // 3. Reset call status to 'pending' before alerting
        await db.update(vitals)
            .set({ callStatus: 'pending' })
            .where(eq(vitals.id, String(vitalsId)));

        console.log("✅ callStatus reset to 'pending' for vitalsId:", vitalsId);

        // 4. Construct and Send FCM Message
        const message = {
            notification: {
                title: "New Patient Calling",
                body: `${displayName} is requesting a video consultation.`,
            },
            data: {
                type: "INCOMING_CALL",
                vitalsId: String(vitalsId),
                click_action: `/doctor/dashboard/call/${vitalsId}`,
                token: String(patientData?.token ?? ''),   // ✅ include patient token
            },
            token: doctor.fcmToken,
        };

        await messaging.send(message);
        console.log("✅ FCM sent to doctor:", doctorId, "with patient token:", patientData?.token);
        return res.json({ success: true, message: "Doctor notified." });

    } catch (err: any) {
        console.error("❌ FCM ALERT ERROR:", err.code, err.message, err);
        return res.status(500).json({
            error: "Internal server error during notification.",
            debug: err.code || err.message
        });
    }
});

// --- DOCTOR CALLS THIS TO ACCEPT THE CALL ---
router.post('/accept-call', authenticateDoctor, async (req: any, res: Response) => {
    const { vitalsId } = req.body;

    if (!vitalsId) {
        return res.status(400).json({ error: "Missing vitalsId" });
    }

    try {
        await db.update(vitals)
            .set({ callStatus: 'accepted' })
            .where(eq(vitals.id, String(vitalsId)));

        console.log(`✅ Call ${vitalsId} accepted by doctor`);
        return res.json({ success: true, message: "Call accepted" });

    } catch (err: any) {
        console.error("❌ ACCEPT CALL ERROR:", err.message);
        return res.status(500).json({ error: "Failed to accept call" });
    }
});

// --- PATIENT POLLS THIS TO CHECK IF DOCTOR JOINED ---
// We use the regular authenticate here because the Kiosk is calling this
router.get('/call-status/:vitalsId', authenticate, async (req: Request, res: Response) => {
    const { vitalsId } = req.params;

    try {
        const [record] = await db.select({
            status: vitals.callStatus 
        })
            .from(vitals)
            .where(eq(vitals.id, String(vitalsId)))
            .limit(1);

        if (!record) {
            return res.status(404).json({ error: "Session not found" });
        }

        return res.json({ 
            success: true, 
            status: record.status || 'idle' 
        });

    } catch (err: any) {
        console.error("❌ STATUS CHECK ERROR:", err.message);
        return res.status(500).json({ error: "Failed to check status" });
    }
});

// POST /api/notifications/end-call
router.post('/end-call', authenticate, async (req: any, res: Response) => {
  const { vitalsId, reason } = req.body; // Add 'reason' here
  console.log(reason)

  if (!vitalsId) {
    return res.status(400).json({ error: "Vitals ID required" });
  }

  // Determine the specific status to save
  // Possible values: 'declined_by_patient', 'declined_by_doctor', 'doctor_not_responding'
  const finalStatus = reason || 'default';

  try {
    await db.update(vitals)
      .set({ 
        callStatus: finalStatus, 
        roomName: null 
      })
      .where(eq(vitals.id, String(vitalsId)));

    console.log(`🧹 Session ${vitalsId} set to: ${finalStatus}`);
    return res.json({ success: true, status: finalStatus });

  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;