import { Router } from 'express';
import { db } from '../db';
import { all_entries, vitals } from '../db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';

const router = Router();

// --- HELPER: GENERATE SEQUENTIAL DAILY TOKEN ---
const getNextToken = async () => {
  try {
    // Use the database's own CURRENT_DATE to avoid timezone mismatches with JS
    const lastEntry = await db.select({ token: all_entries.token })
      .from(all_entries)
      .where(sql`DATE(${all_entries.createdAt}) = CURRENT_DATE`)
      .orderBy(desc(all_entries.token))
      .limit(1);

    // If no entries today, start at 0001
    if (lastEntry.length === 0 || !lastEntry[0].token) {
      return "0001";
    }

    // Convert to number, increment, and pad back to 4 digits
    const lastTokenNumber = parseInt(lastEntry[0].token);
    const nextTokenNumber = isNaN(lastTokenNumber) ? 1 : lastTokenNumber + 1;
    
    return nextTokenNumber.toString().padStart(4, '0');
  } catch (error) {
    console.error("TOKEN GENERATION ERROR:", error);
    return "0001"; // Fallback safe value
  }
};

// --- 1. SAVE OR UPDATE PATIENT ---
router.post('/save', authenticate, async (req: any, res: any) => {
  const { id } = req.body; 
  const userId = req.user.userId;

  try {
    let result;
    const isValidId = id && id !== "null" && id !== "" && id !== undefined;

    // IMPORTANT: Generate fresh token for every NEW visit record/click
    const freshToken = await getNextToken();

    const formattedData: any = {
      user_id: userId,
      token: freshToken, 
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
    };

    if (isValidId) {
      // Update existing and get the new token back
      result = await db.update(all_entries)
        .set(formattedData)
        .where(and(eq(all_entries.id, id), eq(all_entries.user_id, userId)))
        .returning({ id: all_entries.id, token: all_entries.token });
    } else {
      // Insert new and get the new token back
      result = await db.insert(all_entries)
        .values(formattedData)
        .returning({ id: all_entries.id, token: all_entries.token });
    }

    if (!result || result.length === 0) {
      return res.status(404).json({ error: "Operation failed" });
    }

    res.json({ 
        success: true, 
        entryId: result[0].id, 
        token: result[0].token 
    });

  } catch (err: any) {
    console.error("SAVE ERROR:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// --- 2. SEARCH BY PHONE (Demographics only) ---
router.get('/', authenticate, async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: "Phone required" });

  try {
    const [entry] = await db.select().from(all_entries)
      .where(eq(all_entries.phoneNumber, phone as string))
      .orderBy(desc(all_entries.createdAt))
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
        allergies: safeParse(entry.allergies)
      } 
    });
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

// --- 3. VERIFY TOKEN (Triage/Vitals Station) ---
router.get('/verify-token/:token', authenticate, async (req, res) => {
    const token = req.params.token as string; 
  
    try {
      const [patient] = await db.select()
        .from(all_entries)
        .where(and(
            eq(all_entries.token, token),
            sql`DATE(${all_entries.createdAt}) = CURRENT_DATE`
        ))
        .orderBy(desc(all_entries.createdAt))
        .limit(1);
  
      if (!patient) {
        return res.status(404).json({ success: false, error: "Invalid or expired token for today" });
      }
  
      res.json({ 
        success: true, 
        patientId: patient.id, 
        phoneNumber: patient.phoneNumber,
        firstName: patient.firstName 
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

    const newVital = await db.insert(vitals).values({
      patient_id: patientId,
      PulseRate: v.PulseRate?.toString(),
      BloodOxygen: v.Spo2?.toString(), 
      Systolic: v.BP?.value1?.toString(),
      Diastolic: v.BP?.value2?.toString(),
      Temperature: v.Temperature?.toString(),
      Weight: v.Weight?.toString(),
      Height: v.Height?.toString(),
    }).returning();

    res.status(201).json({ success: true, data: newVital[0] });
  } catch (err: any) {
    res.status(500).json({ error: "Vitals save failed" });
  }
});

export default router;