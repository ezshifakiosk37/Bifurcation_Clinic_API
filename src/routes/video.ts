import express, { Request, Response } from "express";
import { db } from '../db';
import { vitals, all_entries } from '../db/schema';
import { eq } from "drizzle-orm";

const router = express.Router();

const DAILY_API_KEY = process.env.DAILY_API_KEY!;
const DAILY_API_URL = process.env.DAILY_API_URL!;

// Create a Daily.co room for a consultation
router.post("/create-room", async (req: Request, res: Response) => {
    try {
        const { consultationId } = req.body;

        const response = await fetch(`${DAILY_API_URL}/rooms`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${DAILY_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: `consult-${consultationId}-${Date.now()}`,
                properties: {
                    exp: Math.floor(Date.now() / 1000) + 3600,
                    enable_chat: true,
                    enable_screenshare: false,
                    start_video_off: false,
                    start_audio_off: false,
                },
            }),
        });
        const data = await response.json();

        // Save room info to vitals row and mark as waiting
        const { vitalsId } = req.body;
        if (vitalsId) {
            await db.update(vitals)
                .set({ roomUrl: data.url, roomName: data.name, callStatus: "waiting" })
                .where(eq(vitals.id, vitalsId));
        }

        res.json({ roomUrl: data.url, roomName: data.name });
    } catch (error) {
        console.error("Error creating Daily.co room:", error);
        res.status(500).json({ error: "Failed to create video room" });
    }
});

// Generate a meeting token (for doctor with owner privileges)
router.post("/create-token", async (req: Request, res: Response) => {
    try {
        const { roomName, isDoctor } = req.body;

        const response = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${DAILY_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                properties: {
                    room_name: roomName,
                    is_owner: isDoctor,
                    enable_recording: isDoctor,
                },
            }),
        });
        const data = await response.json();
        res.json({ token: data.token });
    } catch (error) {
        console.error("Error creating token:", error);
        res.status(500).json({ error: "Failed to create meeting token" });
    }
});

// Doctor polls this to check for waiting patients
router.get("/pending-call", async (req: Request, res: Response) => {
    try {
        const { doctorId } = req.query;

        const pendingVital = await db
            .select({
                vitalsId: vitals.id,
                roomUrl: vitals.roomUrl,
                roomName: vitals.roomName,
                patientFirstName: all_entries.firstName,
                patientLastName: all_entries.lastName,
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
                    roomUrl: call.roomUrl,
                    patientName: `${call.patientFirstName} ${call.patientLastName}`,
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

// Update call status (waiting → active → ended)
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