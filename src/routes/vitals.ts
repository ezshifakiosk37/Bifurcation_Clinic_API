import { Router } from 'express';
import { db } from '../db';
import { vitals } from '../db/schema';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/save', authenticate, async (req, res) => {
  const { patientId, vitals: vData } = req.body;

  try {
    const [inserted] = await db.insert(vitals).values({
      patient_id: patientId,
      PulseRate: vData.PulseRate,
      BloodOxygen: vData.Spo2,
      Systolic: vData.BP?.value1,
      Diastolic: vData.BP?.value2,
      Weight: vData.Weight,
      Height: vData.Height,
    }).returning();

    res.json({ success: true, id: inserted.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to save vitals" });
  }
});

export default router;