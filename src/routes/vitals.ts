//routes/vitals.ts 
import { Router } from 'express';
import { db } from '../db';
import { vitals, all_entries, rapid_testing, eye_testing, color_blind_testing, hearing_testing } from '../db/schema';
import { authenticate } from '../middleware/auth';
import { eq, desc, and } from 'drizzle-orm';

const router = Router();

router.post('/save', authenticate, async (req, res) => {
  const { patientId, vitals: vData } = req.body;

  try {
    const [patient] = await db.select({ token: all_entries.token })
      .from(all_entries)
      .where(eq(all_entries.id, patientId))
      .limit(1);

    const now = new Date();
    const pktDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now);
    const pktTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Karachi',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).format(now);
    const createdDate = pktDate;
    const createdTime = pktTime;

    const [inserted] = await db.insert(vitals).values({
      patient_id: patientId,
      token: patient?.token ?? null,
      createdDate,
      createdTime,
      PulseRate: vData.PulseRate || 'Not Performed',
      BloodOxygen: vData.Spo2 || 'Not Performed',
      Systolic: vData.BP?.value1 || 'Not Performed',
      Diastolic: vData.BP?.value2 || 'Not Performed',
      Temperature: vData.Temperature || 'Not Performed',
      temperatureUnit: vData.temperatureUnitture || 'Not Performed',
      Weight: vData.Weight || 'Not Performed',
      Height: vData.Height || 'Not Performed',
      heightUnit: vData.heightUnit || 'Not Performed',
      symptoms: vData.symptoms?.length
        ? (Array.isArray(vData.symptoms)
          ? vData.symptoms.join(',')
          : vData.symptoms)
        : 'Unknown',
      ...(vData.bmi !== undefined && { bmi: vData.bmi ? vData.bmi.toString() : null }),
      patientType: vData.patientType || "Walk-in",
      callStatus: "idle",
    }).returning();

    res.json({ success: true, vitalsId: inserted.id });
  } catch (err) {
    console.error("Save Error:", err);
    res.status(500).json({ error: "Failed to save vitals" });
  }
});

router.patch('/update/:vitalsId', authenticate, async (req, res) => {
  const { vitalsId } = req.params;
  const { vitals: vData } = req.body;

  try {
    const [updated] = await db.update(vitals)
      .set({
        PulseRate: vData.PulseRate,
        BloodOxygen: vData.Spo2,
        Systolic: vData.BP?.value1,
        Diastolic: vData.BP?.value2,
        Temperature: vData.Temperature,
        temperatureUnit: vData.temperatureUnit,
        Weight: vData.Weight,
        Height: vData.Height,
        heightUnit: vData.heightUnit,
        symptoms: vData.symptoms?.length
          ? (Array.isArray(vData.symptoms)
            ? vData.symptoms.join(',')
            : vData.symptoms)
          : 'Unknown',
        bmi: vData.bmi ? vData.bmi : null,
        patientType: vData.patientType || "Walk-in",
      })
      .where(eq(vitals.id, vitalsId as string))
      .returning();

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ error: "Failed to update vitals" });
  }
});

router.get('/history-by-phone/:phone', authenticate, async (req: any, res: any) => {
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
        bmi: vitals.bmi,
        patientType: vitals.patientType,
        symptoms: vitals.symptoms,
        createdDate: vitals.createdDate,
        createdTime: vitals.createdTime,
      })
      .from(vitals)
      .innerJoin(all_entries, eq(vitals.patient_id, all_entries.id))
      .where(and(
        eq(all_entries.phoneNumber, phone),
        eq(all_entries.user_id, req.user.userId)
      ))
      .orderBy(desc(vitals.createdDate), desc(vitals.createdTime));

    if (!history || history.length === 0) {
      return res.json({ success: true, vitals: [], message: "No history found" });
    }

    // Map Systolic/Diastolic → BP object, BloodOxygen → Spo2
    const mapped = history.map((rec) => ({
      id: rec.id,
      token: rec.token,
      PulseRate: rec.PulseRate,
      Spo2: rec.BloodOxygen,           // frontend expect Spo2
      BP: {
        value1: rec.Systolic,           // frontend expects BP.value1
        value2: rec.Diastolic,          // frontend expects BP.value2
      },
      Temperature: rec.Temperature,
      Weight: rec.Weight,
      Height: rec.Height,
      symptoms: rec.symptoms,
      bmi: rec.bmi,
      patientType: rec.patientType,
      createdDate: rec.createdDate,
      createdTime: rec.createdTime,
    }));

    res.json({ success: true, vitals: mapped });
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch history" });
  }
});

// Save Rapid Testing
router.post('/rapid-testing/save', authenticate, async (req, res) => {
  const { vitalsId, rapidData } = req.body;
  if (!vitalsId || !rapidData) {
    return res.status(400).json({ success: false, error: "vitalsId and rapidData are required" });
  }
  try {
    const now = new Date();
    const createdDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now);
    const createdTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Karachi',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).format(now);

    const [existing] = await db
      .select()
      .from(rapid_testing)
      .where(eq(rapid_testing.vitals_id, vitalsId as string))
      .limit(1);

    if (existing) {
      const [updated] = await db.update(rapid_testing).set({
        bloodSugar: rapidData.bloodSugar?.value
          ? `${rapidData.bloodSugar.value} (${rapidData.bloodSugar.type})`
          : 'Not Performed',
        ecg: rapidData.tests?.find((t: any) => t.id === 'ecg')?.result ?? 'Not Performed',
        hiv: rapidData.tests?.find((t: any) => t.id === 'hiv')?.result ?? 'Not Performed',
        hepatitis: rapidData.tests?.find((t: any) => t.id === 'hepatitis')?.result ?? 'Not Performed',
        hbsag: rapidData.tests?.find((t: any) => t.id === 'hbsag')?.result ?? 'Not Performed',
        hcvAb: rapidData.tests?.find((t: any) => t.id === 'hcvab')?.result ?? 'Not Performed',
        hivAb: rapidData.tests?.find((t: any) => t.id === 'hiv12ab')?.result ?? 'Not Performed',
        dengueNs1Ag: rapidData.tests?.find((t: any) => t.id === 'dengue')?.result ?? 'Not Performed',
        syphilisAb: rapidData.tests?.find((t: any) => t.id === 'syphilis')?.result ?? 'Not Performed',
        typhoidAb: rapidData.tests?.find((t: any) => t.id === 'typhoid')?.result ?? 'Not Performed',
        tuberculosis: rapidData.tests?.find((t: any) => t.id === 'tb')?.result ?? 'Not Performed',
        malariaPfPvAg: rapidData.tests?.find((t: any) => t.id === 'malaria')?.result ?? 'Not Performed',
        hemoglobin: rapidData.moreTests?.find((t: any) => t.id === 'hemoglobin')?.value || null,
        cholesterol: rapidData.moreTests?.find((t: any) => t.id === 'cholesterol')?.value || null,
        bodyFat: rapidData.moreTests?.find((t: any) => t.id === 'bodyfat')?.value || null,
      }).where(eq(rapid_testing.id, existing.id)).returning();
      return res.json({ success: true, data: updated });
    }

    const [inserted] = await db.insert(rapid_testing).values({
      vitals_id: vitalsId,
      bloodSugar: rapidData.bloodSugar?.value
        ? `${rapidData.bloodSugar.value} (${rapidData.bloodSugar.type})`
        : 'Not Performed',
      ecg: rapidData.tests?.find((t: any) => t.id === 'ecg')?.result ?? 'Not Performed',
      hiv: rapidData.tests?.find((t: any) => t.id === 'hiv')?.result ?? 'Not Performed',
      hepatitis: rapidData.tests?.find((t: any) => t.id === 'hepatitis')?.result ?? 'Not Performed',
      hbsag: rapidData.tests?.find((t: any) => t.id === 'hbsag')?.result ?? 'Not Performed',
      hcvAb: rapidData.tests?.find((t: any) => t.id === 'hcvab')?.result ?? 'Not Performed',
      hivAb: rapidData.tests?.find((t: any) => t.id === 'hiv12ab')?.result ?? 'Not Performed',
      dengueNs1Ag: rapidData.tests?.find((t: any) => t.id === 'dengue')?.result ?? 'Not Performed',
      syphilisAb: rapidData.tests?.find((t: any) => t.id === 'syphilis')?.result ?? 'Not Performed',
      typhoidAb: rapidData.tests?.find((t: any) => t.id === 'typhoid')?.result ?? 'Not Performed',
      tuberculosis: rapidData.tests?.find((t: any) => t.id === 'tb')?.result ?? 'Not Performed',
      malariaPfPvAg: rapidData.tests?.find((t: any) => t.id === 'malaria')?.result ?? 'Not Performed',
      hemoglobin: rapidData.moreTests?.find((t: any) => t.id === 'hemoglobin')?.value || null,
      cholesterol: rapidData.moreTests?.find((t: any) => t.id === 'cholesterol')?.value || null,
      bodyFat: rapidData.moreTests?.find((t: any) => t.id === 'bodyfat')?.value || null,
      createdDate,
      createdTime,
    }).returning();

    res.json({ success: true, data: inserted });
  } catch (err) {
    console.error("Rapid Testing Save Error:", err);
    res.status(500).json({ success: false, error: "Failed to save rapid testing data" });
  }
});

// Update Rapid Testing
router.patch('/rapid-testing/update/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { rapidData } = req.body;
  if (!rapidData) {
    return res.status(400).json({ success: false, error: "rapidData is required" });
  }
  try {
    const [updated] = await db.update(rapid_testing).set({
      bloodSugar: rapidData.bloodSugar?.value
        ? `${rapidData.bloodSugar.value} (${rapidData.bloodSugar.type})`
        : 'Not Performed',
      ecg: rapidData.tests?.find((t: any) => t.id === 'ecg')?.result ?? 'Not Performed',
      hiv: rapidData.tests?.find((t: any) => t.id === 'hiv')?.result ?? 'Not Performed',
      hepatitis: rapidData.tests?.find((t: any) => t.id === 'hepatitis')?.result ?? 'Not Performed',
      hbsag: rapidData.tests?.find((t: any) => t.id === 'hbsag')?.result ?? 'Not Performed',
      hcvAb: rapidData.tests?.find((t: any) => t.id === 'hcvab')?.result ?? 'Not Performed',
      hivAb: rapidData.tests?.find((t: any) => t.id === 'hiv12ab')?.result ?? 'Not Performed',
      dengueNs1Ag: rapidData.tests?.find((t: any) => t.id === 'dengue')?.result ?? 'Not Performed',
      syphilisAb: rapidData.tests?.find((t: any) => t.id === 'syphilis')?.result ?? 'Not Performed',
      typhoidAb: rapidData.tests?.find((t: any) => t.id === 'typhoid')?.result ?? 'Not Performed',
      tuberculosis: rapidData.tests?.find((t: any) => t.id === 'tb')?.result ?? 'Not Performed',
      malariaPfPvAg: rapidData.tests?.find((t: any) => t.id === 'malaria')?.result ?? 'Not Performed',
      hemoglobin: rapidData.moreTests?.find((t: any) => t.id === 'hemoglobin')?.value || null,
      cholesterol: rapidData.moreTests?.find((t: any) => t.id === 'cholesterol')?.value || null,
      bodyFat: rapidData.moreTests?.find((t: any) => t.id === 'bodyfat')?.value || null,
    }).where(eq(rapid_testing.id, id as string)).returning();

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Rapid Testing Update Error:", err);
    res.status(500).json({ success: false, error: "Failed to update rapid testing data" });
  }
});

// Get Rapid Testing by vitalsId
router.get('/rapid-testing/:vitalsId', authenticate, async (req, res) => {
  const { vitalsId } = req.params;
  try {
    const [record] = await db.select()
      .from(rapid_testing)
      .where(eq(rapid_testing.vitals_id, vitalsId as string))
      .limit(1);

    res.json({ success: true, data: record ?? null });
  } catch (err) {
    console.error("Rapid Testing Fetch Error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch rapid testing data" });
  }
});

// EYE TESTING + COLOR BLIND (eye_testing)
// ─────────────────────────────────────────────

// Helper to get PKT date/time (reuse the same logic as above)
const getPktDateTime = () => {
  const now = new Date();
  const createdDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  const createdTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(now);
  return { createdDate, createdTime };
};

// POST /api/vitals/eye-testing/save
router.post('/eye-testing/save', authenticate, async (req, res) => {
  const { vitalsId, eyeData } = req.body;
  if (!vitalsId || !eyeData) {
    return res.status(400).json({ success: false, error: 'vitalsId and eyeData are required' });
  }

  const { chartType, leftEye, rightEye, leftEyeResult, rightEyeResult } = eyeData;
  const { createdDate, createdTime } = getPktDateTime();

  try {
    const [existing] = await db
      .select()
      .from(eye_testing)
      .where(eq(eye_testing.vitals_id, vitalsId as string))
      .limit(1);

    let result;
    if (existing) {
      [result] = await db.update(eye_testing)
        .set({
          chartType: chartType ?? existing.chartType,
          leftEye: leftEye ?? existing.leftEye,
          rightEye: rightEye ?? existing.rightEye,
          leftEyeResult: leftEyeResult ?? existing.leftEyeResult,
          rightEyeResult: rightEyeResult ?? existing.rightEyeResult,
        })
        .where(eq(eye_testing.id, existing.id))
        .returning();
    } else {
      [result] = await db.insert(eye_testing)
        .values({
          vitals_id: vitalsId,
          chartType: chartType || 'Not Performed',
          leftEye: leftEye || 'Not Performed',
          rightEye: rightEye || 'Not Performed',
          leftEyeResult: leftEyeResult || 'Not Performed',
          rightEyeResult: rightEyeResult || 'Not Performed',
          createdDate,
          createdTime,
        })
        .returning();
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Eye testing save error:', err);
    res.status(500).json({ success: false, error: 'Failed to save eye testing data' });
  }
});

// GET /api/vitals/eye-testing/:vitalsId
router.get('/eye-testing/:vitalsId', authenticate, async (req, res) => {
  const { vitalsId } = req.params;
  try {
    const [record] = await db
      .select()
      .from(eye_testing)
      .where(eq(eye_testing.vitals_id, vitalsId as string))
      .limit(1);
    res.json({ success: true, data: record ?? null });
  } catch (err) {
    console.error('Eye testing fetch error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch eye testing data' });
  }
});

// POST /api/vitals/color-blind/save
router.post('/color-blind/save', authenticate, async (req, res) => {
  const { vitalsId, colorBlindData } = req.body;
  if (!vitalsId || !colorBlindData) {
    return res.status(400).json({ success: false, error: 'vitalsId and colorBlindData are required' });
  }

  const { plate1, plate2, plate3, colorBlindResult } = colorBlindData;
  const { createdDate, createdTime } = getPktDateTime();

  try {
    const [existing] = await db
      .select()
      .from(color_blind_testing)
      .where(eq(color_blind_testing.vitals_id, vitalsId as string))
      .limit(1);

    let result;
    if (existing) {
      [result] = await db.update(color_blind_testing)
        .set({
          plate1: plate1 ?? existing.plate1,
          plate2: plate2 ?? existing.plate2,
          plate3: plate3 ?? existing.plate3,
          colorBlindResult: colorBlindResult ?? existing.colorBlindResult,
        })
        .where(eq(color_blind_testing.id, existing.id))
        .returning();
    } else {
      [result] = await db.insert(color_blind_testing)
        .values({
          vitals_id: vitalsId,
          plate1: plate1 || 'Not Performed',
          plate2: plate2 || 'Not Performed',
          plate3: plate3 || 'Not Performed',
          colorBlindResult: colorBlindResult || 'Not Performed',
          createdDate,
          createdTime,
        })
        .returning();
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Color blind save error:', err);
    res.status(500).json({ success: false, error: 'Failed to save color blind data' });
  }
});

// GET /api/vitals/color-blind/:vitalsId
router.get('/color-blind/:vitalsId', authenticate, async (req, res) => {
  const { vitalsId } = req.params;
  try {
    const [record] = await db
      .select()
      .from(color_blind_testing)
      .where(eq(color_blind_testing.vitals_id, vitalsId as string))
      .limit(1);
    res.json({ success: true, data: record ?? null });
  } catch (err) {
    console.error('Color blind fetch error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch color blind data' });
  }
});

// ─────────────────────────────────────────────
// HEARING TESTING
// ─────────────────────────────────────────────

// POST /api/vitals/hearing-testing/save
router.post('/hearing-testing/save', authenticate, async (req, res) => {
  const { vitalsId, hearingData } = req.body;

  if (!vitalsId || !hearingData) {
    return res.status(400).json({ success: false, error: 'vitalsId and hearingData are required' });
  }

  const { createdDate, createdTime } = getPktDateTime();

  // Serialize leftEar — only heard frequencies, or "Not Performed"
  const serializeEar = (ear: Record<number, number>): string => {
    if (!ear || Object.keys(ear).length === 0) return 'Not Performed';
    const serialized: Record<string, string> = {};
    Object.entries(ear).forEach(([hz, db]) => {
      serialized[hz] = db.toString();
    });
    return JSON.stringify(serialized);
  };

  const leftEar = serializeEar(hearingData.leftEar);
  const rightEar = serializeEar(hearingData.rightEar);
  const leftEarResult = hearingData.leftResult || 'Not Performed';
  const rightEarResult = hearingData.rightResult || 'Not Performed';

  try {
    // Check if record already exists for this vitalsId
    const [existing] = await db
      .select()
      .from(hearing_testing)
      .where(eq(hearing_testing.vitals_id, vitalsId as string))
      .limit(1);

    let result;

    if (existing) {
      // Update existing record
      [result] = await db.update(hearing_testing)
        .set({
          leftEar,
          rightEar,
          leftEarResult,
          rightEarResult,
        })
        .where(eq(hearing_testing.id, existing.id))
        .returning();
    } else {
      // Insert new record
      [result] = await db.insert(hearing_testing)
        .values({
          vitals_id: vitalsId,
          leftEar,
          rightEar,
          leftEarResult,
          rightEarResult,
          createdDate,
          createdTime,
        })
        .returning();
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Hearing testing save error:', err);
    res.status(500).json({ success: false, error: 'Failed to save hearing testing data' });
  }
});

// GET /api/vitals/hearing-testing/:vitalsId
router.get('/hearing-testing/:vitalsId', authenticate, async (req, res) => {
  const { vitalsId } = req.params;

  try {
    const [record] = await db
      .select()
      .from(hearing_testing)
      .where(eq(hearing_testing.vitals_id, vitalsId as string))
      .limit(1);

    res.json({ success: true, data: record ?? null });
  } catch (err) {
    console.error('Hearing testing fetch error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch hearing testing data' });
  }
});

export default router;