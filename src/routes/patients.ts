// routes/pateints.ts
import { Router } from 'express';
import { db } from '../db';
import { all_entries, vitals, prescriptions, prescription_medicines, doctors } from '../db/schema';
import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import { authenticate, authenticateAny } from '../middleware/auth';
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
const getNextToken = async (userId: string) => {
  try {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());

    const lastEntry = await db
      .select({ token: all_entries.token })
      .from(all_entries)
      .where(and(
        eq(all_entries.tokenDate, today),
        eq(all_entries.user_id, userId),
      ))
      .orderBy(desc(sql`cast(${all_entries.token} as integer)`))
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
// router.post('/save', authenticate, async (req: any, res: any) => {
//   const { id } = req.body;
//   const userId = req.user.userId;

//   try {
//     const isValidId = id && id !== "null" && id !== "" && id !== undefined;

//     let effectiveId: string | null = isValidId ? id : null;

//     if (isValidId) {
//       const [ownerCheck] = await db
//         .select({ user_id: all_entries.user_id })
//         .from(all_entries)
//         .where(eq(all_entries.id, id))
//         .limit(1);

//       if (!ownerCheck || ownerCheck.user_id !== userId) {
//         effectiveId = null; // Different clinic or not found — force new insert
//       }
//     }
//     const { createdDate, createdTime } = getNow();

//     // ── GUARD: block re-tokenization if patient is already in vitals/doctor queue ──
//     if (effectiveId) {
//       const today = new Intl.DateTimeFormat('en-CA', {
//         timeZone: 'Asia/Karachi',
//         year: 'numeric', month: '2-digit', day: '2-digit',
//       }).format(new Date());

//       const [existing] = await db
//         .select({
//           vitalsRecorded: all_entries.vitalsRecorded,
//           tokenDate: all_entries.tokenDate,
//           token: all_entries.token,
//         })
//         .from(all_entries)
//         .where(and(eq(all_entries.id, effectiveId!), eq(all_entries.user_id, userId)))
//         .limit(1);

//       if (existing && existing.tokenDate === today) {

//         // Check if current token already has a prescription (this visit is done)
//         const [prescriptionForCurrentToken] = await db
//           .select({ id: prescriptions.id })
//           .from(prescriptions)
//           .where(
//             and(
//               eq(prescriptions.patient_id, id),
//               eq(prescriptions.prescriptionDate, today),
//               eq(prescriptions.token, existing.token!)
//             )
//           )
//           .limit(1);

//         if (!prescriptionForCurrentToken) {
//           // Current token visit is NOT done yet — block re-entry
//           const inVitalsQueue = existing.vitalsRecorded === false;
//           return res.status(409).json({
//             error: inVitalsQueue
//               ? "Patient is already waiting for vitals. Please complete vitals first."
//               : "Patient is already waiting in the doctor queue. Token cannot be regenerated until the doctor ends their session."
//           });
//         }
//         // Current token has a prescription = that visit is fully done, allow new token
//       }
//     }

//     const freshToken = await getNextToken(userId);

//     let result;

//     if (effectiveId) {
//       // Returning patient at same clinic — update token
//       result = await db.update(all_entries)
//         .set({
//           user_id: userId,
//           token: freshToken,
//           tokenDate: createdDate,
//           tokenTime: createdTime,
//           vitalsRecorded: false,
//           phoneNumber: req.body.phoneNumber || "null",
//           firstName: req.body.firstName || "null",
//           lastName: req.body.lastName || "null",
//           father_husband: req.body.father_husband || "null",
//           age: parseInt(req.body.age) || 0,
//           gender: req.body.gender || "null",
//           email: req.body.email || "null",
//           cnic: req.body.cnic || "null",
//           dob: req.body.dob || "null",
//           country: req.body.country || "null",
//           province: req.body.province || "null",
//           city: req.body.city || "null",
//           stAddress: req.body.stAddress || "null",
//           languages: req.body.languages || "null",
//           surgicalHistory: req.body.surgicalHistory || "None",
//           medicalHistory: Array.isArray(req.body.medicalHistory) ? JSON.stringify(req.body.medicalHistory) : "[]",
//           medicineHistory: Array.isArray(req.body.medicineHistory) ? JSON.stringify(req.body.medicineHistory) : "[]",
//           allergies: Array.isArray(req.body.allergies) ? JSON.stringify(req.body.allergies) : "[]",
//         })
//         .where(and(eq(all_entries.id, effectiveId), eq(all_entries.user_id, userId)))
//         .returning({ id: all_entries.id, token: all_entries.token });

//     } else {
//       // New patient or cross-clinic visit — insert fresh row for this clinic
//       result = await db.insert(all_entries)
//         .values({
//           user_id: userId,
//           token: freshToken,
//           createdDate,
//           createdTime,
//           tokenDate: createdDate,
//           tokenTime: createdTime,
//           phoneNumber: req.body.phoneNumber || "null",
//           firstName: req.body.firstName || "null",
//           lastName: req.body.lastName || "null",
//           father_husband: req.body.father_husband || "null",
//           age: parseInt(req.body.age) || 0,
//           gender: req.body.gender || "null",
//           email: req.body.email || "null",
//           cnic: req.body.cnic || "null",
//           dob: req.body.dob || "null",
//           country: req.body.country || "null",
//           province: req.body.province || "null",
//           city: req.body.city || "null",
//           stAddress: req.body.stAddress || "null",
//           languages: req.body.languages || "null",
//           surgicalHistory: req.body.surgicalHistory || "None",
//           medicalHistory: Array.isArray(req.body.medicalHistory) ? JSON.stringify(req.body.medicalHistory) : "[]",
//           medicineHistory: Array.isArray(req.body.medicineHistory) ? JSON.stringify(req.body.medicineHistory) : "[]",
//           allergies: Array.isArray(req.body.allergies) ? JSON.stringify(req.body.allergies) : "[]",
//         })
//         .returning({ id: all_entries.id, token: all_entries.token });
//     }

//     if (!result || result.length === 0) {
//       return res.status(404).json({ error: "Operation failed" });
//     }

//     res.json({ success: true, entryId: result[0].id, token: result[0].token });

//   } catch (err: any) {
//     console.error("SAVE ERROR:", err);
//     res.status(500).json({ error: "Database error", details: err.message });
//   }
// });

router.post('/save', authenticate, async (req: any, res: any) => {
  const { id, mrNumber, ...fields } = req.body;
  const userId = req.user.userId;

  // ── Determine mode ──
  const isMRMode = !!mrNumber && mrNumber.trim() !== "";

  // ── Validation ──
  if (isMRMode) {
    const requiredMr = ['mrNumber', 'firstName', 'gender', 'dob', 'age', 'country', 'city', 'province'];
    for (let field of requiredMr) {
      if (!req.body[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }
  } else {
    const requiredNormal = ['phoneNumber', 'firstName', 'gender', 'dob', 'age', 'country', 'city', 'province'];
    for (let field of requiredNormal) {
      if (!req.body[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }
  }

  const { createdDate, createdTime } = getNow();

  // ── Find existing patient (based on mode) ──
  let existingPatient = null;
  if (isMRMode) {
    const [found] = await db
      .select()
      .from(all_entries)
      .where(and(eq(all_entries.mrNumber, mrNumber), eq(all_entries.user_id, userId)))
      .limit(1);
    existingPatient = found;
  } else {
    const phone = req.body.phoneNumber;
    if (phone) {
      const [found] = await db
        .select()
        .from(all_entries)
        .where(and(eq(all_entries.phoneNumber, phone), eq(all_entries.user_id, userId)))
        .limit(1);
      existingPatient = found;
    }
  }

  let effectiveId = existingPatient?.id || (id && id !== "null" ? id : null);

  // ── Verify ownership ──
  if (effectiveId) {
    const [ownerCheck] = await db
      .select({ user_id: all_entries.user_id })
      .from(all_entries)
      .where(eq(all_entries.id, effectiveId))
      .limit(1);
    if (!ownerCheck || ownerCheck.user_id !== userId) {
      effectiveId = null;
    }
  }

  // ── Guard: prevent re‑tokenization if already waiting today ──
  if (effectiveId) {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());

    const [existing] = await db
      .select({ vitalsRecorded: all_entries.vitalsRecorded, tokenDate: all_entries.tokenDate, token: all_entries.token })
      .from(all_entries)
      .where(and(eq(all_entries.id, effectiveId), eq(all_entries.user_id, userId)))
      .limit(1);

    if (existing && existing.tokenDate === today) {
      const [prescriptionForCurrentToken] = await db
        .select({ id: prescriptions.id })
        .from(prescriptions)
        .where(
          and(
            eq(prescriptions.patient_id, effectiveId),
            eq(prescriptions.prescriptionDate, today),
            eq(prescriptions.token, existing.token!)
          )
        )
        .limit(1);

      if (!prescriptionForCurrentToken) {
        const inVitalsQueue = existing.vitalsRecorded === false;
        return res.status(409).json({
          error: inVitalsQueue
            ? "Patient is already waiting for vitals. Please complete vitals first."
            : "Patient is already waiting in the doctor queue. Token cannot be regenerated until the doctor ends their session."
        });
      }
    }
  }

  const freshToken = await getNextToken(userId);
  let result;

  // Base values common to both modes
  const baseValues = {
    user_id: userId,
    token: freshToken,
    tokenDate: createdDate,
    tokenTime: createdTime,
    vitalsRecorded: false,

    firstName: req.body.firstName,
    lastName: req.body.lastName || "",
    father_husband: req.body.father_husband || "",
    age: parseInt(req.body.age) || 0,
    gender: req.body.gender,
    email: req.body.email || "",
    dob: req.body.dob,
    country: req.body.country,
    province: req.body.province,
    city: req.body.city,
    stAddress: req.body.stAddress || "",
    languages: req.body.languages || "",
    surgicalHistory: req.body.surgicalHistory || "None",
    medicalHistory: Array.isArray(req.body.medicalHistory) ? JSON.stringify(req.body.medicalHistory) : "[]",
    medicineHistory: Array.isArray(req.body.medicineHistory) ? JSON.stringify(req.body.medicineHistory) : "[]",
    allergies: Array.isArray(req.body.allergies) ? JSON.stringify(req.body.allergies) : "[]",
    profilePhoto: req.body.profilePhoto || null,
    countryCode: req.body.countryCode || "PK",
  };

  if (isMRMode) {
    // MR mode – store mrNumber, phoneNumber is optional (keep it if sent)
    const mrValues = {
      ...baseValues,
      mrNumber: mrNumber,
      phoneNumber: req.body.phoneNumber || "", // optional, can be empty
      cnic: "", // clear CNIC in MR mode (or keep as is)
    };

    if (effectiveId) {
      result = await db.update(all_entries)
        .set(mrValues)
        .where(eq(all_entries.id, effectiveId))
        .returning({ id: all_entries.id, token: all_entries.token });
    } else {
      result = await db.insert(all_entries)
        .values({ ...mrValues, createdDate, createdTime })
        .returning({ id: all_entries.id, token: all_entries.token });
    }
  } else {
    // Normal mode – store phoneNumber, cnic, and optionally clear mrNumber
    const normalValues = {
      ...baseValues,
      phoneNumber: req.body.phoneNumber,
      cnic: req.body.cnic || "",
      mrNumber: null, // explicitly clear mrNumber when saving via phone
    };

    if (effectiveId) {
      result = await db.update(all_entries)
        .set(normalValues)
        .where(eq(all_entries.id, effectiveId))
        .returning({ id: all_entries.id, token: all_entries.token });
    } else {
      result = await db.insert(all_entries)
        .values({ ...normalValues, createdDate, createdTime })
        .returning({ id: all_entries.id, token: all_entries.token });
    }
  }

  if (!result || result.length === 0) {
    return res.status(404).json({ error: "Operation failed" });
  }

  res.json({ success: true, entryId: result[0].id, token: result[0].token });
});

// --- 2. SEARCH BY PHONE ---
router.get('/', authenticate, async (req, res) => {
  const { phone, cnic, mrNumber } = req.query;

  // At least one search parameter is required
  if (!phone && !cnic && !mrNumber) {
    return res.status(400).json({ error: "Phone, CNIC or MR Number required" });
  }

  try {
    const { userId } = (req as any).user;

    // Build search condition based on which param is provided
    let searchCondition;
    if (mrNumber) {
      searchCondition = eq(all_entries.mrNumber, mrNumber as string);
    } else if (cnic) {
      searchCondition = eq(all_entries.cnic, cnic as string);
    } else {
      searchCondition = eq(all_entries.phoneNumber, phone as string);
    }

    // First try to find a record belonging to this clinic
    let [entry] = await db.select().from(all_entries)
      .where(and(
        searchCondition,
        eq(all_entries.user_id, userId)
      ))
      .orderBy(desc(all_entries.createdDate), desc(all_entries.createdTime))
      .limit(1);

    // If not found at this clinic, fall back to any clinic (for pre-filling demographics)
    if (!entry) {
      [entry] = await db.select().from(all_entries)
        .where(searchCondition)
        .orderBy(desc(all_entries.createdDate), desc(all_entries.createdTime))
        .limit(1);
    }

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
    console.error("SEARCH ERROR:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

// --- 3. VERIFY TOKEN ---
router.get('/verify-token/:token', authenticateAny, async (req: any, res: any) => {
  const token = req.params.token as string;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

  // Resolve clinic user_id from either staff or doctor token
  let scopedUserId: string | undefined;
  if (req.user?.userId) {
    scopedUserId = req.user.userId;
  } else if (req.doctor?.doctorId) {
    const [doc] = await db.select({ user_id: doctors.user_id })
      .from(doctors)
      .where(eq(doctors.id, req.doctor.doctorId))
      .limit(1);
    scopedUserId = doc?.user_id ?? undefined;
  }

  try {
    const [patient] = await db.select()
      .from(all_entries)
      .where(and(
        eq(all_entries.token, token),
        eq(all_entries.tokenDate, today),
        ...(scopedUserId ? [eq(all_entries.user_id, scopedUserId)] : []),
      ))
      .orderBy(desc(all_entries.tokenDate), desc(all_entries.tokenTime))
      .limit(1);
    if (!patient) {
      return res.status(404).json({ success: false, error: "Invalid or expired token for today" });
    }

    // Check if this token already has a prescription (session ended)
    const [prescription] = await db
      .select({ id: prescriptions.id })
      .from(prescriptions)
      .where(
        and(
          eq(prescriptions.patient_id, patient.id),
          eq(prescriptions.prescriptionDate, today),
          eq(prescriptions.token, patient.token!)
        )
      )
      .limit(1);

    if (prescription) {
      return res.status(409).json({
        success: false,
        error: "Token already used today"
      });
    }

    res.json({
      success: true,
      patientId: patient.id,
      phoneNumber: patient.phoneNumber,
      firstName: patient.firstName,
      lastName: patient.lastName,
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

    // Fetch the patient's token to store alongside vital
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
      bmi: v.bmi ? v.bmi.toString() : null,
      temperatureUnit: v.temperatureUnit || '°C',
      heightUnit: v.heightUnit || 'ft',
      patientType: v.patientType || "Walk-in",
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
router.get('/today-stats', authenticateAny, async (req: any, res) => {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

  const doctorId = req.query.doctorId as string | undefined;

  // Resolve which clinic's user_id to scope to
  let scopedUserId: string | undefined;
  if (req.user?.userId) {
    scopedUserId = req.user.userId;
  } else if (req.doctor?.doctorId) {
    const [doc] = await db.select({ user_id: doctors.user_id })
      .from(doctors)
      .where(eq(doctors.id, req.doctor.doctorId))
      .limit(1);
    scopedUserId = doc?.user_id ?? undefined;
  }

  try {
    const [prescriptionCount] = await db
      .select({ total: sql<number>`count(*)` })
      .from(prescriptions)
      .where(
        doctorId
          ? and(eq(prescriptions.prescriptionDate, today), eq(prescriptions.doctor_id, doctorId))
          : eq(prescriptions.prescriptionDate, today)
      );

    const [withoutPrescription] = await db
      .select({ total: sql<number>`count(*)` })
      .from(all_entries)
      .where(and(
        eq(all_entries.tokenDate, today),
        ...(scopedUserId ? [eq(all_entries.user_id, scopedUserId)] : []),
        sql`not exists (
      select 1 from ${prescriptions}
      where ${prescriptions.patient_id} = ${all_entries.id}
      and ${prescriptions.prescriptionDate} = ${today}
      and ${prescriptions.token} = ${all_entries.token}
    )`
      ));

    const [queueCount] = await db
      .select({ total: sql<number>`count(*)` })
      .from(all_entries)
      .where(and(
        eq(all_entries.tokenDate, today),
        eq(all_entries.vitalsRecorded, true),
        ...(scopedUserId ? [eq(all_entries.user_id, scopedUserId)] : []),


        sql`not exists (
      select 1 from ${prescriptions}
      where ${prescriptions.patient_id} = ${all_entries.id}
      and ${prescriptions.prescriptionDate} = ${today}
      and ${prescriptions.token} = ${all_entries.token}
    )`
      ));

    res.json({
      success: true,
      todayPatients: (Number(withoutPrescription.total) + Number(prescriptionCount.total)) || 0,
      inQueue: queueCount.total || 0,
      completed: prescriptionCount.total || 0,
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
router.get('/today-queue', authenticateAny, async (req: any, res) => {
  const doctorId = req.query.doctorId as string | undefined;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

  // Resolve clinic user_id from either staff or doctor token
  let scopedUserId: string | undefined;
  if (req.user?.userId) {
    scopedUserId = req.user.userId;
  } else if (req.doctor?.doctorId) {
    const [doc] = await db.select({ user_id: doctors.user_id })
      .from(doctors)
      .where(eq(doctors.id, req.doctor.doctorId))
      .limit(1);
    scopedUserId = doc?.user_id ?? undefined;
  }

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
      .where(and(
        eq(all_entries.tokenDate, today),
        ...(scopedUserId ? [eq(all_entries.user_id, scopedUserId)] : []),
      ))
      .orderBy(desc(all_entries.tokenTime));

    // Step 1b: get which patients already have a prescription today
    const completedToday = await db
      .select({ patient_id: prescriptions.patient_id, token: prescriptions.token })
      .from(prescriptions)
      .where(
        doctorId
          ? and(eq(prescriptions.prescriptionDate, today), eq(prescriptions.doctor_id, doctorId as string))
          : eq(prescriptions.prescriptionDate, today)
      );

    // A patient is only "completed" if their CURRENT token matches the prescription token
    // This handles returning patients who get a new token after doctor session ends
    // Build a map of patientId -> SET of completed tokens (handles multiple visits same day)
    const completedMap = new Map<string, Set<string>>();
    for (const c of completedToday) {
      if (!completedMap.has(c.patient_id)) {
        completedMap.set(c.patient_id, new Set());
      }
      completedMap.get(c.patient_id)!.add(c.token!);
    }

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
    // Step 4: active queue — vitals done but current token not yet prescribed
    const activeQueue = patients
      .filter(p => p.vitalsRecorded && !completedMap.get(p.id)?.has(p.token!))
      .map(p => {
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

    // Step 5: completed — one row PER PRESCRIPTION so returning patients show twice
    // Step 5: completed — join prescriptions WITH vitals on same token
    // This guarantees one row per actual visit (vitals prove the visit happened)
    const completedQueue = await db
      .select({
        prescriptionId: prescriptions.id,
        prescriptionToken: prescriptions.token,
        diagnosis: prescriptions.diagnosis,
        prescriptionTime: prescriptions.prescriptionTime,
        patientId: all_entries.id,
        firstName: all_entries.firstName,
        lastName: all_entries.lastName,
        phoneNumber: all_entries.phoneNumber,
        age: all_entries.age,
        gender: all_entries.gender,
        symptoms: vitals.symptoms,
        patientType: vitals.patientType,
      })
      .from(prescriptions)
      .innerJoin(all_entries, eq(prescriptions.patient_id, all_entries.id))
      .innerJoin(
        vitals,
        and(
          eq(vitals.patient_id, prescriptions.patient_id),
          eq(vitals.token, prescriptions.token),
          eq(vitals.id, sql`(
            select id from vitals v2
            where v2.patient_id = ${prescriptions.patient_id}
            and v2.token = ${prescriptions.token}
            order by v2.created_date desc, v2.created_time desc
            limit 1
          )`)
        )
      )
      .where(
        doctorId
          ? and(
            eq(prescriptions.prescriptionDate, today),
            eq(prescriptions.doctor_id, doctorId)
          )
          : eq(prescriptions.prescriptionDate, today)
      )
      .orderBy(desc(prescriptions.prescriptionTime));

    res.json({
      success: true,
      patients: activeQueue,
      completed: completedQueue.map(c => ({
        id: c.patientId,
        prescriptionId: c.prescriptionId,
        token: c.prescriptionToken,
        firstName: c.firstName,
        lastName: c.lastName,
        phoneNumber: c.phoneNumber,
        age: c.age,
        gender: c.gender,
        diagnosis: c.diagnosis,
        symptoms: c.symptoms ?? null,
        patientType: c.patientType ?? 'Walk-in',
        isCompleted: true,
      })),
    });
  } catch (err: any) {
    console.error("TODAY QUEUE ERROR:", err);
    res.status(500).json({ error: "Failed to load today's queue" });
  }
});

router.get('/get-all-prescriptions-today', authenticate, async (req: any, res) => {
  try {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());

    const tokenFilter = req.query.token as string | undefined;

    // 1. Get today's prescriptions + patient info (filtered by token if provided)
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
      .where(
        tokenFilter
          ? and(
            eq(prescriptions.prescriptionDate, today),
            eq(prescriptions.token, tokenFilter),
            eq(all_entries.user_id, (req as any).user.userId)
          )
          : and(
            eq(prescriptions.prescriptionDate, today),
            eq(all_entries.user_id, (req as any).user.userId)
          )
      )
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

// ─────────────────────────────────────────────
// 8. VITALS QUEUE — patients with token today but vitals NOT recorded
// ─────────────────────────────────────────────
router.get('/vitals-queue', authenticateAny, async (req: any, res) => {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

  try {
    const patients = await db
      .select({
        id: all_entries.id,
        token: all_entries.token,
        firstName: all_entries.firstName,
        lastName: all_entries.lastName,
        phoneNumber: all_entries.phoneNumber,
        age: all_entries.age,
        gender: all_entries.gender,
        tokenTime: all_entries.tokenTime,
      })
      .from(all_entries)
      .where(and(
        eq(all_entries.tokenDate, today),
        eq(all_entries.vitalsRecorded, false),
        eq(all_entries.user_id, (req as any).user.userId),
      ))
      .orderBy(all_entries.tokenTime);

    res.json({ success: true, patients });
  } catch (err: any) {
    console.error("VITALS QUEUE ERROR:", err);
    res.status(500).json({ error: "Failed to load vitals queue" });
  }
});

router.get('/latest-vitals/:patientId/:token', authenticate, async (req, res: any) => {
  const { patientId, token } = req.params;

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  try {
    const latest = await db
      .select()
      .from(vitals)
      .where(and(
        eq(vitals.patient_id, String(patientId)),
        eq(vitals.token, String(token)),
        eq(vitals.createdDate, today)
      ))
      .orderBy(desc(vitals.createdTime))
      .limit(1);

    res.json({
      success: true,
      vital: latest[0] || null
    });
  } catch (err: any) {
    console.error("LATEST VITALS ERROR:", err);
    res.status(500).json({ success: false, error: "Failed to fetch vitals", details: err.message });
  }
});

// GET /api/patients/by-vitals/:vitalsId
router.get('/patient-by-vitals/:vitalsId', authenticateDoctor, async (req: any, res: any) => {
  const { vitalsId } = req.params;

  try {
    const result = await db
      .select({
        // ── Vitals record ──────────────────────────────────────────────
        patient_id: vitals.patient_id,
        vitalsToken: vitals.token,
        temp: vitals.Temperature,
        systolic: vitals.Systolic,
        diastolic: vitals.Diastolic,
        pulse: vitals.PulseRate,
        weight: vitals.Weight,
        height: vitals.Height,
        spo2: vitals.BloodOxygen,
        symptoms: vitals.symptoms,

        // ── Patient demographics ───────────────────────────────────────
        id: all_entries.id,
        firstName: all_entries.firstName,
        lastName: all_entries.lastName,
        phoneNumber: all_entries.phoneNumber,
        token: all_entries.token,
        age: all_entries.age,
        gender: all_entries.gender,
        email: all_entries.email,
        city: all_entries.city,
        medicalHistory: all_entries.medicalHistory,
      })
      .from(vitals)
      .innerJoin(all_entries, eq(vitals.patient_id, all_entries.id))
      .where(eq(vitals.id, vitalsId))
      .limit(1);

    if (!result.length) {
      return res.status(404).json({ error: "Vitals record not found" });
    }

    const row = result[0];

    return res.json({
      success: true,

      // For prescription + call routing
      patientId: row.id,
      token: row.token,
      vitalsToken: row.vitalsToken,

      // Demographics
      firstName: row.firstName,
      lastName: row.lastName,
      age: row.age,
      gender: row.gender,
      phone: row.phoneNumber,
      email: row.email,
      city: row.city,
      medicalHistory: row.medicalHistory,
      symptoms: row.symptoms,

      // Vitals nested for PatientInfoModal
      vitals: {
        temp: row.temp,
        bp: row.systolic && row.diastolic ? `${row.systolic}/${row.diastolic}` : null,
        pulse: row.pulse,
        weight: row.weight,
        height: row.height,
        spo2: row.spo2,
      },
    });

  } catch (err: any) {
    console.error("GET PATIENT BY VITALS ID ERROR:", err);
    return res.status(500).json({ error: "Failed to fetch patient", details: err.message });
  }
});

export default router;
