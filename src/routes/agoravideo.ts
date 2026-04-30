import { Router, Response } from 'express';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { vitals } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';

const router = Router();

const APP_ID = process.env.AGORA_APP_ID || '';
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '';

router.get('/token/:vitalsId', async (req: any, res: Response) => {
  // Accept both doctor tokens ({ doctorId }) and staff/kiosk tokens ({ userId })
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const authToken = authHeader.split(' ')[1];
  try {
    jwt.verify(authToken, process.env.JWT_SECRET!);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { vitalsId } = req.params;
  const uid = 0;
  const role = RtcRole.PUBLISHER;
  const privilegeExpiredTs = Math.floor(Date.now() / 1000) + 3600;

  if (!vitalsId) {
    return res.status(400).json({ error: 'Vitals ID is required' });
  }

  if (!APP_ID || !APP_CERTIFICATE) {
    return res.status(500).json({ error: 'Agora credentials missing in server .env' });
  }

  try {
    const existingSession = await db
      .select()
      .from(vitals)
      .where(eq(vitals.id, vitalsId))
      .limit(1);

    if (existingSession.length === 0) {
      return res.status(404).json({ error: 'Invalid Session: No matching vitals record found.' });
    }

    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      vitalsId,
      uid,
      role,
      privilegeExpiredTs
    );

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