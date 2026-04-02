import { Router } from 'express';
import { db } from '../db';
import { all_entries, vitals } from '../db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';

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
      .where(eq(all_entries.tokenDate, today))   // use tokenDate here too
      .orderBy(desc(all_entries.token))
      .limit(1);

    if (lastEntry.length === 0 || !lastEntry[0].token) return "0001";

    const lastTokenNumber = parseInt(lastEntry[0].token);
    const nextTokenNumber = isNaN(lastTokenNumber) ? 1 : lastTokenNumber + 1;
    return nextTokenNumber.toString().padStart(4, '0');
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
    const freshToken = await getNextToken();
    const { createdDate, createdTime } = getNow();

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
    }).returning();

    await db.update(all_entries)
      .set({ vitalsRecorded: true })
      .where(eq(all_entries.id, patientId));

    res.status(201).json({ success: true, data: newVital[0] });
  } catch (err: any) {
    console.error("VITALS SAVE ERROR:", err);
    res.status(500).json({ error: "Vitals save failed", details: err.message });
  }
});

export default router;