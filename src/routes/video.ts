import express, { Request, Response } from "express";

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

export default router;