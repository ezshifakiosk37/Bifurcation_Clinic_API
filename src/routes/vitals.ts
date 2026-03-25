import { Router } from 'express';
import { db } from '../db';
import { vitals, all_entries } from '../db/schema';
import { authenticate } from '../middleware/auth';
import { eq } from 'drizzle-orm';

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
      Temperature: vData.Temperature, // ADDED: Save Temperature
      Weight: vData.Weight,
      Height: vData.Height,
    }).returning();

    res.json({ success: true, id: inserted.id });
  } catch (err) {
    console.error("Save Error:", err);
    res.status(500).json({ error: "Failed to save vitals" });
  }
});

router.get('/history-by-phone/:phone', authenticate, async (req, res) => {
  const { phone } = req.params;

  // ADDED: Explicit check to satisfy TypeScript/Drizzle overload
  if (typeof phone !== 'string') {
    return res.status(400).json({ success: false, error: "Invalid phone number" });
  }

  try {
    const history = await db
      .select({
        id: vitals.id,
        PulseRate: vitals.PulseRate,
        BloodOxygen: vitals.BloodOxygen,
        Systolic: vitals.Systolic,
        Diastolic: vitals.Diastolic,
        Temperature: vitals.Temperature,
        Weight: vitals.Weight,
        Height: vitals.Height,
        createdAt: vitals.createdAt,
      })
      .from(vitals)
      .innerJoin(all_entries, eq(vitals.patient_id, all_entries.id))
      .where(eq(all_entries.phoneNumber, phone));

    // Handle case where no history is found
    if (!history || history.length === 0) {
       return res.json({ success: true, vitals: [], message: "No history found for this phone number" });
    }

    res.json({ success: true, vitals: history });
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch history" });
  }
});

export default router;