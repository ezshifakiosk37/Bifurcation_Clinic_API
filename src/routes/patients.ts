import { Router } from 'express';
import { db } from '../db';
import { all_entries, vitals } from '../db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';

const router = Router();

// --- HELPER: GENERATE SEQUENTIAL DAILY TOKEN ---
const getNextToken = async () => {
  const today = new Date().toISOString().split('T')[0]; // Gets YYYY-MM-DD

  // Find the highest token issued today
  const lastEntry = await db.select({ token: all_entries.token })
    .from(all_entries)
    .where(sql`DATE(${all_entries.createdAt}) = ${today}`)
    .orderBy(desc(all_entries.token))
    .limit(1);

  if (lastEntry.length === 0) {
    return "0001";
  }

  // Increment the last token and pad with leading zeros
  const lastTokenNumber = parseInt(lastEntry[0].token || "0");
  const nextTokenNumber = lastTokenNumber + 1;
  return nextTokenNumber.toString().padStart(4, '0');
};

// --- 1. SAVE OR UPDATE PATIENT ---
router.post('/save', authenticate, async (req: any, res: any) => {
  const { id } = req.body; 
  const userId = req.user.userId;

  try {
    let result;
    const isValidId = id && id !== "null" && id !== "" && id !== undefined;

    // Strict mapping: Only these keys go to the Database
    const formattedData: any = {
      user_id: userId,
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
      // If updating, we keep the existing token or refresh it based on your clinic's preference.
      // Usually, a re-checkin gets a NEW token for the new daily queue.
      formattedData.token = await getNextToken(); 

      result = await db.update(all_entries)
        .set(formattedData)
        .where(and(eq(all_entries.id, id), eq(all_entries.user_id, userId)))
        .returning();
    } else {
      // New Patient Entry gets a new sequential token
      formattedData.token = await getNextToken();

      result = await db.insert(all_entries).values(formattedData).returning();
    }

    if (!result || result.length === 0) {
      return res.status(404).json({ error: "No record found" });
    }

    // Return entryId and the new token to the frontend
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

// --- 2. SEARCH BY PHONE ---
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

// --- 3. VERIFY TOKEN (Used by Vitals Page) ---
// --- 3. VERIFY TOKEN (Used by Vitals Page) ---
router.get('/verify-token/:token', authenticate, async (req, res) => {
    // Explicitly cast to string to satisfy Drizzle's type checker
    const token = req.params.token as string; 
    const today = new Date().toISOString().split('T')[0];
  
    try {
      const [patient] = await db.select()
        .from(all_entries)
        .where(and(
            // Use the casted variable here
            eq(all_entries.token, token),
            sql`DATE(${all_entries.createdAt}) = ${today}`
        ))
        .limit(1);
  
      if (!patient) {
        return res.status(404).json({ success: false, error: "Invalid or expired token" });
      }
  
      res.json({ 
        success: true, 
        patientId: patient.id, 
        phoneNumber: patient.phoneNumber 
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