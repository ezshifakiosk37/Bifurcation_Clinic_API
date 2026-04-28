import { Router, Response } from 'express';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { authenticate } from '../middleware/auth';
import { db } from '../db';
import { vitals } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

const APP_ID = process.env.AGORA_APP_ID || '';
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '';

/**
 * GET /api/agoravideo/token/:vitalsId
 * Uses the Vitals UUID as the unique Channel Name (Appointment ID)
 */
router.get('/token/:vitalsId', authenticate, async (req: any, res: Response) => {
    const { vitalsId } = req.params;
    
    // Logic: Use the database ID of the user for the Agora UID.
    // If your DB uses UUIDs, Agora's buildTokenWithUid expects an INTEGER.
    // If your ID is a string/UUID, pass 0 to let Agora assign a random integer UID,
    // or hash your UUID to an integer. For now, we'll use 0 for compatibility.
    const uid = 0; 
    const role = RtcRole.PUBLISHER;

    const expirationTimeInSeconds = 3600; // 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // 1. Validation
    if (!vitalsId) {
        return res.status(400).json({ error: 'Vitals ID (Session ID) is required' });
    }

    if (!APP_ID || !APP_CERTIFICATE) {
        return res.status(500).json({ error: 'Agora credentials missing in server .env' });
    }

    try {
        // 2. Database Verification (The "Brutally Honest" Security Check)
        // We verify that this Vitals record actually exists before generating a token.
        const existingSession = await db
            .select()
            .from(vitals)
            .where(eq(vitals.id, vitalsId))
            .limit(1);

        if (existingSession.length === 0) {
            return res.status(404).json({ error: 'Invalid Session: No matching vitals record found.' });
        }

        // 3. Generate Token
        // We use the vitalsId (UUID string) as the channelName.
        const token = RtcTokenBuilder.buildTokenWithUid(
            APP_ID,
            APP_CERTIFICATE,
            vitalsId, 
            uid,
            role,
            privilegeExpiredTs
        );

        // 4. Update the room status in the DB (Optional but recommended)
        await db.update(vitals)
            .set({ callStatus: 'active', roomName: vitalsId })
            .where(eq(vitals.id, vitalsId));

        return res.status(200).json({
            success: true,
            token,
            uid,
            channelName: vitalsId,
            expiresIn: "3600s"
        });

    } catch (err: any) {
        console.error('AGORA_TOKEN_ERROR:', err);
        return res.status(500).json({ error: 'Failed to generate secure video token' });
    }
});

export default router;