import { Router } from 'express';
import { db } from '../db';
import { all_entries, vitals } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/add', authenticate, async (req: any, res: any) => {
  try {
    // 1. Extract data from request body
    const { phoneNumber, firstName, lastName, father_husband, age, gender } = req.body;
    
    // 2. Get the logged-in user's ID from the token (provided by middleware)
    const userId = req.user.userId;

    // 3. Validation: Check if required fields exist
    if (!phoneNumber || !firstName || !lastName || !age || !gender) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 4. Insert into database
    const newPatient = await db.insert(all_entries).values({
      phoneNumber,
      firstName,
      lastName,
      father_husband,
      age,
      gender,
      user_id: userId // Linking patient to the staff member
    }).returning();

    // 5. Send success response
    res.status(201).json({ 
      success: true, 
      message: "Patient added successfully", 
      patientId: newPatient[0].id 
    });

  } catch (err: any) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

// GET: Find by phone
router.get('/', authenticate, async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: "Phone required" });

  const [entry] = await db.select().from(all_entries)
    .where(eq(all_entries.phoneNumber, phone as string))
    .orderBy(desc(all_entries.createdAt))
    .limit(1);

  if (!entry) return res.status(404).json({ error: "Not found" });
  res.json({ entryId: entry.id, fields: entry });
});

// POST: Add Patient Vitals
router.post('/save-vitals', authenticate, async (req: any, res: any) => {
  try {
    const { patientId, vitals: v } = req.body;

    // Logic Check: Ensure we actually have a patient to attach vitals to
    if (!patientId) {
      return res.status(400).json({ error: "Missing patient ID" });
    }

    // Insert into the 'vitals' table you defined in your schema
    const newVital = await db.insert(vitals).values({
      patient_id: patientId,
      PulseRate: v.PulseRate,
      BloodOxygen: v.Spo2,      // Note: mapping 'Spo2' from frontend to 'BloodOxygen' in DB
      Systolic: v.BP.value1,    // value1 -> Systolic
      Diastolic: v.BP.value2,   // value2 -> Diastolic
      Weight: v.Weight,
      Height: v.Height,
      // Temperature isn't in your schema! Add it to schema or ignore it for now.
    }).returning();

    res.status(201).json({ 
      success: true, 
      message: "Vitals recorded successfully", 
      data: newVital[0] 
    });

  } catch (err: any) {
    console.error("Vitals DB Error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

// POST: Save or Update
router.post('/save', authenticate, async (req, res) => {
  const { id, ...data } = req.body;
  const userId = (req as any).user.userId;

  try {
    let result;
    if (id) {
      result = await db.update(all_entries).set({ ...data, user_id: userId })
        .where(and(eq(all_entries.id, id), eq(all_entries.user_id, userId)))
        .returning();
    } else {
      result = await db.insert(all_entries).values({ ...data, user_id: userId }).returning();
    }
    res.json({ success: true, entryId: result[0].id });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// GET: Get all entries (paginated)
router.get('/all', authenticate, async (req, res) => {
  try {
    const entries = await db.select()
      .from(all_entries)
      .orderBy(desc(all_entries.createdAt))
      .limit(50); // Don't return thousands of rows at once

    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

// DELETE: Remove an entry
router.delete('/:id', authenticate, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const deleted = await db.delete(all_entries)
      .where(and(eq(all_entries.id, id), eq(all_entries.user_id, userId)))
      .returning();

    if (deleted.length === 0) return res.status(404).json({ error: "Entry not found or unauthorized" });
    
    res.json({ success: true, message: "Entry deleted" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;