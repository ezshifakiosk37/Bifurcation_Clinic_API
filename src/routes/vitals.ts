import { Router } from 'express';
import { db } from '../db';
import { vitals, all_entries } from '../db/schema';
import { authenticate } from '../middleware/auth';
import { eq, desc } from 'drizzle-orm';

const router = Router();

router.post('/save', authenticate, async (req, res) => {
  const { patientId, vitals: vData } = req.body;

  try {
    const [patient] = await db.select({ token: all_entries.token })
      .from(all_entries)
      .where(eq(all_entries.id, patientId))
      .limit(1);

    const now = new Date();
    const createdDate = now.toISOString().split('T')[0];
    const createdTime = now.toTimeString().split(' ')[0];

    const [inserted] = await db.insert(vitals).values({
      patient_id: patientId,
      token: patient?.token ?? null,
      createdDate,
      createdTime,
      PulseRate: vData.PulseRate,
      BloodOxygen: vData.Spo2,
      Systolic: vData.BP?.value1,
      Diastolic: vData.BP?.value2,
      Temperature: vData.Temperature,
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

  if (typeof phone !== 'string') {
    return res.status(400).json({ success: false, error: "Invalid phone number" });
  }

  try {
    const history = await db
      .select({
        id: vitals.id,
        token: vitals.token,
        PulseRate: vitals.PulseRate,
        BloodOxygen: vitals.BloodOxygen,
        Systolic: vitals.Systolic,
        Diastolic: vitals.Diastolic,
        Temperature: vitals.Temperature,
        Weight: vitals.Weight,
        Height: vitals.Height,
        createdDate: vitals.createdDate,
        createdTime: vitals.createdTime,
      })
      .from(vitals)
      .innerJoin(all_entries, eq(vitals.patient_id, all_entries.id))
      .where(eq(all_entries.phoneNumber, phone))
      .orderBy(desc(vitals.createdDate), desc(vitals.createdTime));

    if (!history || history.length === 0) {
      return res.json({ success: true, vitals: [], message: "No history found" });
    }

    // Map Systolic/Diastolic → BP object, BloodOxygen → Spo2
    const mapped = history.map((rec) => ({
      id: rec.id,
      token: rec.token,
      PulseRate: rec.PulseRate,
      Spo2: rec.BloodOxygen,           // frontend expects Spo2
      BP: {
        value1: rec.Systolic,           // frontend expects BP.value1
        value2: rec.Diastolic,          // frontend expects BP.value2
      },
      Temperature: rec.Temperature,
      Weight: rec.Weight,
      Height: rec.Height,
      createdDate: rec.createdDate,
      createdTime: rec.createdTime,
    }));

    res.json({ success: true, vitals: mapped });
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch history" });
  }
});

export default router;