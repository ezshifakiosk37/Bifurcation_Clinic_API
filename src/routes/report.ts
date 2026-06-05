import { Router } from 'express';
import { db } from '../db';
import { all_entries, vitals, rapid_testing, eye_testing, color_blind_testing, hearing_testing } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/vitals/:vitalsId', async (req, res) => {
  const { vitalsId } = req.params;

  try {
    // 1. Get vitals
    const vitalsRecord = await db.select().from(vitals).where(eq(vitals.id, vitalsId)).limit(1);
    if (!vitalsRecord.length) {
      return res.status(404).json({ success: false, error: 'Vitals not found' });
    }
    const v = vitalsRecord[0];

    // 2. Get patient
    const patient = await db.select().from(all_entries).where(eq(all_entries.id, v.patient_id)).limit(1);
    if (!patient.length) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }
    const p = patient[0];

    // 3. Get rapid testing (if exists)
    const rapid = await db.select().from(rapid_testing).where(eq(rapid_testing.vitals_id, vitalsId)).limit(1);
    // 4. Get eye testing
    const eye = await db.select().from(eye_testing).where(eq(eye_testing.vitals_id, vitalsId)).limit(1);
    // 5. Get color blind testing
    const colorBlind = await db.select().from(color_blind_testing).where(eq(color_blind_testing.vitals_id, vitalsId)).limit(1);
    // 6. Get hearing testing
    const hearing = await db.select().from(hearing_testing).where(eq(hearing_testing.vitals_id, vitalsId)).limit(1);

    // Build response
    const reportData = {
      success: true,
      data: {
        patient: {
          firstName: p.firstName,
          lastName: p.lastName,
          age: p.age,
          gender: p.gender,
          phone: p.phoneNumber,
          token: p.token,
          createdDate: v.createdDate,
        },
        vitals: {
          PulseRate: v.PulseRate,
          BloodOxygen: v.BloodOxygen,
          Systolic: v.Systolic,
          Diastolic: v.Diastolic,
          Temperature: v.Temperature,
          Weight: v.Weight,
          Height: v.Height,
          symptoms: v.symptoms,
          bmi: v.bmi,
        },
        rapidTesting: rapid[0] || null,
        eyeTesting: eye[0] || null,
        colorBlindTesting: colorBlind[0] || null,
        hearingTesting: hearing[0] || null,
      }
    };

    return res.json(reportData);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;