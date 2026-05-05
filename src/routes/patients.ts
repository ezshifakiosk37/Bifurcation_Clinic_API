// routes/pateints.ts
import { Router } from 'express';
import { db } from '../db';
import { all_entries, vitals, prescriptions, prescription_medicines } from '../db/schema';
import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { authenticateDoctor } from './doctors';

const router = Router();

// --- HELPER: Get current date and time strings ---
const getNow = () => {
  const now = new Date();

  // Force Pakistan Standard Time (UTC+5) for date and time
  const pktFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const pktTimeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const createdDate = pktFormatter.format(now); // "YYYY-MM-DD"
  const createdTime = pktTimeFormatter.format(now); // "HH:MM:SS"

  return { createdDate, createdTime };
};

// --- HELPER: GENERATE SEQUENTIAL DAILY TOKEN ---
const getNextToken = async () => {
  try {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());

    const lastEntry = await db
      .select({ token: all_entries.token })
      .from(all_entries)
      .where(eq(all_entries.tokenDate, today))
      .orderBy(desc(sql`cast(${all_entries.token} as integer)`))  // ← numeric sort
      .limit(1);

    if (lastEntry.length === 0 || !lastEntry[0].token) return "1";

    const lastTokenNumber = parseInt(lastEntry[0].token);
    const nextTokenNumber = isNaN(lastTokenNumber) ? 1 : lastTokenNumber + 1;
    return nextTokenNumber.toString();
  } catch (error) {
    console.error("TOKEN GENERATION ERROR:", error);
    return "0001";
  }
};

// --- 1. SAVE OR UPDATE PATIENT ---
router.post('/save', authenticate, async (req: any, res: any) => {
  const { id } = req.body;
  const userId = req.user.userId;

  try {
    const isValidId = id && id !== "null" && id !== "" && id !== undefined;
    const { createdDate, createdTime } = getNow();

    // ── GUARD: block re-tokenization if patient is already in vitals/doctor queue ──
    if (isValidId) {
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Karachi',
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date());

      const [existing] = await db
        .select({
          vitalsRecorded: all_entries.vitalsRecorded,
          tokenDate: all_entries.tokenDate,
        })
        .from(all_entries)
        .where(and(eq(all_entries.id, id), eq(all_entries.user_id, userId)))
        .limit(1);

      if (existing && existing.tokenDate === today) {
        // Check if doctor has already completed their session (prescription exists today)
        const [prescription] = await db
          .select({ id: prescriptions.id })
          .from(prescriptions)
          .where(
            and(
              eq(prescriptions.patient_id, id),
              eq(prescriptions.prescriptionDate, today)
            )
          )
          .limit(1);

        if (!prescription) {
          const inVitalsQueue = existing.vitalsRecorded === false;
          return res.status(409).json({
            error: inVitalsQueue
              ? "Patient is already waiting for vitals. Please complete vitals first."
              : "Patient is already waiting in the doctor queue. Token cannot be regenerated until the doctor ends their session."
          });
        }
        // else: doctor session done, fall through and allow a fresh token
      }
    }

    const freshToken = await getNextToken();

    let result;

    if (isValidId) {
      // Returning patient — only update token + tokenDate/Time, never touch createdDate/Time
      result = await db.update(all_entries)
        .set({
          user_id: userId,
          token: freshToken,
          tokenDate: createdDate,
          tokenTime: createdTime,
          vitalsRecorded: false,
          phoneNumber: req.body.phoneNumber || "null",
          firstName: req.body.firstName || "null",
          lastName: req.body.lastName || "null",
          father_husband: req.body.father_husband || "null",
          age: parseInt(req.body.age) || 0,
          gender: req.body.gender || "null",
          email: req.body.email || "null",
          cnic: req.body.cnic || "null",
          dob: req.body.dob || "null",
          country: req.body.country || "null",
          province: req.body.province || "null",
          city: req.body.city || "null",
          stAddress: req.body.stAddress || "null",
          languages: req.body.languages || "null",
          surgicalHistory: req.body.surgicalHistory || "None",
          medicalHistory: Array.isArray(req.body.medicalHistory) ? JSON.stringify(req.body.medicalHistory) : "[]",
          medicineHistory: Array.isArray(req.body.medicineHistory) ? JSON.stringify(req.body.medicineHistory) : "[]",
          allergies: Array.isArray(req.body.allergies) ? JSON.stringify(req.body.allergies) : "[]",
        })
        .where(and(eq(all_entries.id, id), eq(all_entries.user_id, userId)))
        .returning({ id: all_entries.id, token: all_entries.token });

    } else {
      // New patient — set both createdDate/Time and tokenDate/Time
      result = await db.insert(all_entries)
        .values({
          user_id: userId,
          token: freshToken,
          createdDate,
          createdTime,
          tokenDate: createdDate,
          tokenTime: createdTime,
          phoneNumber: req.body.phoneNumber || "null",
          firstName: req.body.firstName || "null",
          lastName: req.body.lastName || "null",
          father_husband: req.body.father_husband || "null",
          age: parseInt(req.body.age) || 0,
          gender: req.body.gender || "null",
          email: req.body.email || "null",
          cnic: req.body.cnic || "null",
          dob: req.body.dob || "null",
          country: req.body.country || "null",
          province: req.body.province || "null",
          city: req.body.city || "null",
          stAddress: req.body.stAddress || "null",
          languages: req.body.languages || "null",
          surgicalHistory: req.body.surgicalHistory || "None",
          medicalHistory: Array.isArray(req.body.medicalHistory) ? JSON.stringify(req.body.medicalHistory) : "[]",
          medicineHistory: Array.isArray(req.body.medicineHistory) ? JSON.stringify(req.body.medicineHistory) : "[]",
          allergies: Array.isArray(req.body.allergies) ? JSON.stringify(req.body.allergies) : "[]",
        })
        .returning({ id: all_entries.id, token: all_entries.token });
    }

    if (!result || result.length === 0) {
      return res.status(404).json({ error: "Operation failed" });
    }

    res.json({ success: true, entryId: result[0].id, token: result[0].token });

  } catch (err: any) {
    console.error("SAVE ERROR:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// --- 2. SEARCH BY PHONE ---
router.get('/', authenticate, async (req, res) => {
  const { phone, cnic } = req.query;
  if (!phone && !cnic) return res.status(400).json({ error: "Phone or CNIC required" });

  try {
    const [entry] = await db.select().from(all_entries)
      .where(
        cnic
          ? eq(all_entries.cnic, cnic as string)
          : eq(all_entries.phoneNumber, phone as string)
      )
      .orderBy(desc(all_entries.createdDate), desc(all_entries.createdTime))
      .limit(1);

    if (!entry) return res.status(404).json({ error: "Patient not found" });

    const safeParse = (val: any) => {
      try { return typeof val === 'string' ? JSON.parse(val) : val; }
      catch { return []; }
    };

    res.json({
      entryId: entry.id,
      fields: {
        ...entry,
        medicalHistory: safeParse(entry.medicalHistory),
        medicineHistory: safeParse(entry.medicineHistory),
        allergies: safeParse(entry.allergies),
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

// --- 3. VERIFY TOKEN ---
router.get('/verify-token/:token', authenticate, async (req, res) => {
  const token = req.params.token as string;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

  try {
    const [patient] = await db.select()
      .from(all_entries)
      .where(and(
        eq(all_entries.token, token),
        eq(all_entries.tokenDate, today)
      ))
      .orderBy(desc(all_entries.tokenDate), desc(all_entries.tokenTime))
      .limit(1);
    if (!patient) {
      return res.status(404).json({ success: false, error: "Invalid or expired token for today" });
    }

    if (patient.vitalsRecorded && patient.tokenDate === today) {
      return res.status(409).json({ success: false, error: "Token already used today" });
    }

    res.json({
      success: true,
      patientId: patient.id,
      phoneNumber: patient.phoneNumber,
      firstName: patient.firstName,
    });
  } catch (err) {
    console.error("VERIFY ERROR:", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

// --- 4. SAVE VITALS ---
router.post('/save-vitals', authenticate, async (req: any, res: any) => {
  try {
    const { patientId, vitals: v } = req.body;
    if (!patientId) return res.status(400).json({ error: "Missing patient ID" });

    // Fetch the patient's token to store alongside vitals
    const [patient] = await db.select({ token: all_entries.token })
      .from(all_entries)
      .where(eq(all_entries.id, patientId))
      .limit(1);

    const { createdDate, createdTime } = getNow();

    const newVital = await db.insert(vitals).values({
      patient_id: patientId,
      token: patient?.token ?? null,
      createdDate,
      createdTime,
      PulseRate: v.PulseRate?.toString(),
      BloodOxygen: v.Spo2?.toString(),
      Systolic: v.BP?.value1?.toString(),
      Diastolic: v.BP?.value2?.toString(),
      Temperature: v.Temperature?.toString(),
      Weight: v.Weight?.toString(),
      Height: v.Height?.toString(),
      bmi: v.bmi ? v.bmi.toString() : null,                 // ADD
      patientType: v.patientType || "Walk-in",
      symptoms: v.symptoms ? v.symptoms.toString() : null,
      callStatus: "idle",
    }).returning();

    await db.update(all_entries)
      .set({ vitalsRecorded: true })
      .where(eq(all_entries.id, patientId));

    res.status(201).json({ success: true, vitalsId: newVital[0].id, data: newVital[0] });
  } catch (err: any) {
    console.error("VITALS SAVE ERROR:", err);
    res.status(500).json({ error: "Vitals save failed", details: err.message });
  }
});

// ─────────────────────────────────────────────
// 5. TODAY'S DASHBOARD STATS (for page.tsx)
// ─────────────────────────────────────────────
router.get('/today-stats', authenticate, async (req, res) => {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

  try {
    const [stats] = await db
      .select({
        totalPatients: sql<number>`count(distinct ${all_entries.id})`,
        inQueue: sql<number>`count(distinct ${all_entries.id}) filter (where ${all_entries.vitalsRecorded} = true and ${prescriptions.id} is null)`,
        completed: sql<number>`count(distinct ${prescriptions.patient_id})`,
      })
      .from(all_entries)
      .leftJoin(prescriptions, and(
        eq(prescriptions.patient_id, all_entries.id),
        eq(prescriptions.prescriptionDate, today)
      ))
      .where(eq(all_entries.tokenDate, today));

    res.json({
      success: true,
      todayPatients: stats.totalPatients || 0,
      inQueue: stats.inQueue || 0,
      completed: stats.completed || 0,
    });
  } catch (err: any) {
    console.error("TODAY STATS ERROR:", err);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

// ─────────────────────────────────────────────
// 6. SAVE FULL PRESCRIPTION (when doctor ends session)
// ─────────────────────────────────────────────
router.post('/save-prescription', authenticateDoctor, async (req: any, res: any) => {
  const doctorId = req.doctor?.doctorId;
  const { patientId, token, diagnosis, labTest, clinicalNotes, medicines } = req.body;

  if (!patientId || !token) {
    return res.status(400).json({ error: "Patient ID and Token are required" });
  }

  const { createdDate, createdTime } = getNow();

  try {
    // 1. Create prescription header
    const [newPrescription] = await db.insert(prescriptions).values({
      patient_id: patientId,
      doctor_id: doctorId,
      token,
      diagnosis: diagnosis || null,
      labTest: labTest || null,
      clinicalNotes: clinicalNotes || null,
      prescriptionDate: createdDate,
      prescriptionTime: createdTime,
      createdDate,
      createdTime,
    }).returning({ id: prescriptions.id });

    // 2. Insert all medicines
    if (medicines && medicines.length > 0) {
      const medicineValues = medicines.map((m: any) => ({
        prescription_id: newPrescription.id,
        medicineName: m.name,
        morning: !!m.morning,
        afternoon: !!m.afternoon,
        night: !!m.night,
        beforeMeal: m.meal === 'Before Meal',
        afterMeal: m.meal === 'After Meal',
        dosage: m.dosage || null,
        duration: m.duration || null,
      }));

      await db.insert(prescription_medicines).values(medicineValues);
    }

    res.status(201).json({ success: true, prescriptionId: newPrescription.id });
  } catch (err: any) {
    console.error("SAVE PRESCRIPTION ERROR:", err);
    res.status(500).json({ error: "Failed to save prescription", details: err.message });
  }
});

// ─────────────────────────────────────────────
// 7. TODAY'S QUEUE (deduped — one row per patient)
// ─────────────────────────────────────────────
router.get('/today-queue', authenticate, async (req, res) => {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

  try {
    // Step 1: get today's patients with completion status
    const patients = await db
      .select({
        id: all_entries.id,
        token: all_entries.token,
        firstName: all_entries.firstName,
        lastName: all_entries.lastName,
        age: all_entries.age,
        gender: all_entries.gender,
        vitalsRecorded: all_entries.vitalsRecorded,
        tokenTime: all_entries.tokenTime,
        phoneNumber: all_entries.phoneNumber,
      })
      .from(all_entries)
      .where(eq(all_entries.tokenDate, today))
      .orderBy(desc(all_entries.tokenTime));

    // Step 1b: get which patients already have a prescription today
    const completedToday = await db
      .select({ patient_id: prescriptions.patient_id, token: prescriptions.token })
      .from(prescriptions)
      .where(eq(prescriptions.prescriptionDate, today));

    // A patient is only "completed" if their CURRENT token matches the prescription token
    // This handles returning patients who get a new token after doctor session ends
    const completedMap = new Map(completedToday.map(c => [c.patient_id, c.token]));

    if (patients.length === 0) {
      return res.json({ success: true, patients: [] });
    }

    // Step 2: for each patient, get only their latest vitals
    const patientIds = patients.map(p => p.id);

    const latestVitals = await db
      .select({
        patient_id: vitals.patient_id,
        symptoms: vitals.symptoms,
        PulseRate: vitals.PulseRate,
        BloodOxygen: vitals.BloodOxygen,
        Systolic: vitals.Systolic,
        Diastolic: vitals.Diastolic,
        Temperature: vitals.Temperature,
        Weight: vitals.Weight,
        Height: vitals.Height,
        bmi: vitals.bmi,
        vitalId: vitals.id,
        patientType: vitals.patientType,
      })
      .from(vitals)
      .where(sql`${vitals.patient_id} = ANY(ARRAY[${sql.join(patientIds.map(id => sql`${id}::uuid`), sql`, `)}])`)
      .orderBy(desc(vitals.createdDate), desc(vitals.createdTime));

    // Step 3: keep only the latest vitals per patient (first match wins due to ordering)
    const vitalsMap = new Map<string, any>();
    for (const v of latestVitals) {
      if (!vitalsMap.has(v.patient_id)) {
        vitalsMap.set(v.patient_id, v);
      }
    }

    // Step 4: merge with nested vitals object + completion flag
    const result = patients.map(p => {
      const v = vitalsMap.get(p.id);
      return {
        id: p.id,
        token: p.token,
        firstName: p.firstName,
        lastName: p.lastName,
        phoneNumber: p.phoneNumber,
        age: p.age,
        gender: p.gender,
        vitalsRecorded: p.vitalsRecorded,
        isCompleted: completedMap.get(p.id) === p.token,
        symptoms: v?.symptoms ?? null,
        patientType: v?.patientType ?? 'Walk-in',
        vitalsId: v?.vitalId ?? null,
        vitals: v ? {
          temp: v.Temperature ?? '—',
          bp: (v.Systolic && v.Diastolic) ? `${v.Systolic}/${v.Diastolic}` : '—',
          pulse: v.PulseRate ?? '—',
          weight: v.Weight ?? '—',
          BloodOxygen: v.BloodOxygen ?? '—',
          bmi: v.bmi ?? '—',
        } : null,
      };
    });

    res.json({
      success: true,
      patients: result.filter(p => !p.isCompleted && p.vitalsRecorded),
      completed: result.filter(p => p.isCompleted),
    });

  } catch (err: any) {
    console.error("TODAY QUEUE ERROR:", err);
    res.status(500).json({ error: "Failed to load today's queue" });
  }
});

router.get('/get-all-prescriptions-today', authenticate, async (req: any, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Get today's prescriptions + patient info
    const data = await db
      .select({
        prescription: prescriptions,
        patient: {
          id: all_entries.id,
          firstName: all_entries.firstName,
          lastName: all_entries.lastName,
          phoneNumber: all_entries.phoneNumber,
          token: all_entries.token,
        },
      })
      .from(prescriptions)
      .innerJoin(all_entries, eq(all_entries.id, prescriptions.patient_id))
      .where(eq(prescriptions.prescriptionDate, today))
      .orderBy(desc(prescriptions.createdTime));

    if (!data.length) {
      return res.json({ success: true, data: [] });
    }

    // 2. Get all medicines for these prescriptions
    const prescriptionIds = data.map(d => d.prescription.id);

    const medicines = await db
      .select()
      .from(prescription_medicines)
      .where(inArray(prescription_medicines.prescription_id, prescriptionIds));

    // 3. Attach medicines to each prescription
    const result = data.map(item => {
      return {
        ...item.prescription,
        patient: item.patient,
        medicines: medicines.filter(m => m.prescription_id === item.prescription.id),
      };
    });

    return res.json({
      success: true,
      data: result,
    });

  } catch (err: any) {
    console.error("GET ALL PRESCRIPTIONS ERROR:", err);
    return res.status(500).json({
      error: "Failed to fetch prescriptions",
      details: err.message,
    });
  }
});

export default router;
