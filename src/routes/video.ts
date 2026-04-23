import express, { Request, Response } from "express";
import { AccessToken } from "livekit-server-sdk";
import { db } from '../db';
import { vitals, all_entries } from '../db/schema';
import { eq } from "drizzle-orm";

const router = express.Router();

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;

// Create a LiveKit room token for patient
router.post("/create-room", async (req: Request, res: Response) => {
  try {
    const { vitalsId } = req.body;
    if (!vitalsId) {
      return res.status(400).json({ error: "vitalsId required" });
    }

    // Fetch patient info to include in room name
    const [vital] = await db
      .select({
        token: vitals.token,
        patientFirstName: all_entries.firstName,
        patientLastName: all_entries.lastName,
      })
      .from(vitals)
      .innerJoin(all_entries, eq(vitals.patient_id, all_entries.id))
      .where(eq(vitals.id, vitalsId))
      .limit(1);

    const patientToken = vital?.token ?? "unknown";
    const patientName = vital
      ? `${vital.patientFirstName} ${vital.patientLastName}`
      : "Patient";

    // Room name includes token number for doctor to see
    const roomName = `consult-token${patientToken}-${vitalsId}`;

    // Save room info to vitals and mark as waiting
    await db.update(vitals)
      .set({
        roomName: roomName,
        roomUrl: roomName, // for LiveKit we just store roomName
        callStatus: "waiting",
      })
      .where(eq(vitals.id, vitalsId));

    // Generate patient token
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: `patient-${vitalsId}`,
      name: patientName,
    });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    res.json({
      roomName,
      token,
      patientName,
      patientToken,
    });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ error: "Failed to create room" });
  }
});

// Generate token for doctor to join
router.post("/create-token", async (req: Request, res: Response) => {
  try {
    const { roomName, isDoctor } = req.body;

    const identity = isDoctor ? "doctor" : `patient-${Date.now()}`;
    const displayName = isDoctor ? "Doctor" : "Patient";

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      name: displayName,
    });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    res.json({ token });
  } catch (error) {
    console.error("Error creating token:", error);
    res.status(500).json({ error: "Failed to create token" });
  }
});

// Doctor polls this to check for waiting patients
router.get("/pending-call", async (req: Request, res: Response) => {
  try {
    const pendingVital = await db
      .select({
        vitalsId: vitals.id,
        roomName: vitals.roomName,
        patientFirstName: all_entries.firstName,
        patientLastName: all_entries.lastName,
        patientToken: vitals.token,
      })
      .from(vitals)
      .innerJoin(all_entries, eq(vitals.patient_id, all_entries.id))
      .where(eq(vitals.callStatus, "waiting"))
      .limit(1);

    if (pendingVital.length > 0) {
      const call = pendingVital[0];
      res.json({
        pendingCall: {
          vitalsId: call.vitalsId,
          roomName: call.roomName,
          roomUrl: call.roomName,
          // This is what doctor sees in notification ↓
          patientName: `${call.patientFirstName} ${call.patientLastName}`,
          patientToken: call.patientToken,
        }
      });
    } else {
      res.json({ pendingCall: null });
    }
  } catch (error) {
    console.error("Polling error:", error);
    res.status(500).json({ error: "Failed to check pending calls" });
  }
});

// Update call status
router.patch("/call-status", async (req: Request, res: Response) => {
  try {
    const { vitalsId, status } = req.body;
    await db
      .update(vitals)
      .set({ callStatus: status })
      .where(eq(vitals.id, vitalsId));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update call status" });
  }
});

export default router;