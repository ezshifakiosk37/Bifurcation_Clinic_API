import { Router } from 'express';
import { db } from '../db';
import { all_entries, vitals } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';

const router = Router();

// --- 1. SAVE OR UPDATE PATIENT ---
router.post('/save', authenticate, async (req: any, res: any) => {
  const { id } = req.body; 
  const userId = req.user.userId;

  try {
    // Strict mapping: Only these keys go to the Database
    const formattedData = {
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
      //test
      // Handle Arrays: Drizzle text columns need Stringified JSON
      medicalHistory: Array.isArray(req.body.medicalHistory) ? JSON.stringify(req.body.medicalHistory) : "[]",
      medicineHistory: Array.isArray(req.body.medicineHistory) ? JSON.stringify(req.body.medicineHistory) : "[]",
      allergies: Array.isArray(req.body.allergies) ? JSON.stringify(req.body.allergies) : "[]",
    };

    let result;
    // CRITICAL: Check if ID is a valid DB UUID/ID, not the string "null"
    const isValidId = id && id !== "null" && id !== "" && id !== undefined;

    if (isValidId) {
      result = await db.update(all_entries)
        .set(formattedData)
        .where(and(eq(all_entries.id, id), eq(all_entries.user_id, userId)))
        .returning();
    } else {
      result = await db.insert(all_entries).values(formattedData).returning();
    }

    if (!result || result.length === 0) {
      return res.status(404).json({ error: "No record found to update" });
    }

    res.json({ success: true, entryId: result[0].id });
  } catch (err: any) {
    console.error("SAVE ERROR:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// --- 2. SEARCH BY PHONE (With JSON Parsing) ---
router.get('/', authenticate, async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: "Phone required" });

  try {
    const [entry] = await db.select().from(all_entries)
      .where(eq(all_entries.phoneNumber, phone as string))
      .orderBy(desc(all_entries.createdAt))
      .limit(1);

    if (!entry) return res.status(404).json({ error: "Patient not found" });

    // Helper to turn strings back into Arrays for the Frontend
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

// --- 3. SAVE VITALS ---
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















































































// import { Router } from 'express';
// import { db } from '../db';
// import { all_entries, vitals } from '../db/schema';
// import { eq, desc, and } from 'drizzle-orm';
// import { authenticate } from '../middleware/auth';

// const router = Router();

// router.post('/add', authenticate, async (req: any, res: any) => {
//   try {
//     // 1. Extract data from request body
//     const { phoneNumber, firstName, lastName, father_husband, age, gender } = req.body;
    
//     // 2. Get the logged-in user's ID from the token (provided by middleware)
//     const userId = req.user.userId;

//     // 3. Validation: Check if required fields exist
//     if (!phoneNumber || !firstName || !lastName || !age || !gender) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     // 4. Insert into database
//     const newPatient = await db.insert(all_entries).values({
//       phoneNumber,
//       firstName,
//       lastName,
//       father_husband,
//       age,
//       gender,
//       user_id: userId // Linking patient to the staff member
//     }).returning();

//     // 5. Send success response
//     res.status(201).json({ 
//       success: true, 
//       message: "Patient added successfully", 
//       patientId: newPatient[0].id 
//     });

//   } catch (err: any) {
//     console.error("Database Error:", err);
//     res.status(500).json({ error: "Internal Server Error", details: err.message });
//   }
// });

// // GET: Find by phone
// router.get('/', authenticate, async (req, res) => {
//   const { phone } = req.query;
//   if (!phone) return res.status(400).json({ error: "Phone required" });

//   const [entry] = await db.select().from(all_entries)
//     .where(eq(all_entries.phoneNumber, phone as string))
//     .orderBy(desc(all_entries.createdAt))
//     .limit(1);

//   if (!entry) return res.status(404).json({ error: "Not found" });
//   res.json({ entryId: entry.id, fields: entry });
// });

// // POST: Add Patient Vitals
// router.post('/save-vitals', authenticate, async (req: any, res: any) => {
//   try {
//     const { patientId, vitals: v } = req.body;

//     // Logic Check: Ensure we actually have a patient to attach vitals to
//     if (!patientId) {
//       return res.status(400).json({ error: "Missing patient ID" });
//     }

//     // Insert into the 'vitals' table you defined in your schema
//     const newVital = await db.insert(vitals).values({
//       patient_id: patientId,
//       PulseRate: v.PulseRate,
//       BloodOxygen: v.Spo2,      // Note: mapping 'Spo2' from frontend to 'BloodOxygen' in DB
//       Systolic: v.BP.value1,    // value1 -> Systolic
//       Diastolic: v.BP.value2,
//       Temperature: v.Temperature,   // value2 -> Diastolic
//       Weight: v.Weight,
//       Height: v.Height,
//       // Temperature isn't in your schema! Add it to schema or ignore it for now.
//     }).returning();

//     res.status(201).json({ 
//       success: true, 
//       message: "Vitals recorded successfully", 
//       data: newVital[0] 
//     });

//   } catch (err: any) {
//     console.error("Vitals DB Error:", err);
//     res.status(500).json({ error: "Internal Server Error", details: err.message });
//   }
// });

// // POST: Save or Update
// router.post('/save', authenticate, async (req, res) => {
//   const { id, ...data } = req.body;
//   const userId = (req as any).user.userId;

//   try {
//     let result;
//     if (id) {
//       result = await db.update(all_entries).set({ ...data, user_id: userId })
//         .where(and(eq(all_entries.id, id), eq(all_entries.user_id, userId)))
//         .returning();
//     } else {
//       result = await db.insert(all_entries).values({ ...data, user_id: userId }).returning();
//     }
//     res.json({ success: true, entryId: result[0].id });
//   } catch (err) {
//     res.status(500).json({ error: "Database error" });
//   }
// });

// // GET: Get all entries (paginated)
// router.get('/all', authenticate, async (req, res) => {
//   try {
//     const entries = await db.select()
//       .from(all_entries)
//       .orderBy(desc(all_entries.createdAt))
//       .limit(50); // Don't return thousands of rows at once

//     res.json(entries);
//   } catch (err) {
//     res.status(500).json({ error: "Failed to fetch entries" });
//   }
// });

// // DELETE: Remove an entry
// router.delete('/:id', authenticate, async (req: any, res) => {
//   const { id } = req.params;
//   const userId = req.user.userId;

//   try {
//     const deleted = await db.delete(all_entries)
//       .where(and(eq(all_entries.id, id), eq(all_entries.user_id, userId)))
//       .returning();

//     if (deleted.length === 0) return res.status(404).json({ error: "Entry not found or unauthorized" });
    
//     res.json({ success: true, message: "Entry deleted" });
//   } catch (err) {
//     res.status(500).json({ error: "Delete failed" });
//   }
// });

// // GET: Fetch Vitals History for a specific patient
// router.get('/history/:patientId', authenticate, async (req: any, res: any) => {
//   try {
//     const { patientId } = req.params;

//     if (!patientId) {
//       return res.status(400).json({ error: "Patient ID is required" });
//     }

//     // Logic: Fetch all vitals linked to this patient, newest first
//     const history = await db.select()
//       .from(vitals)
//       .where(eq(vitals.patient_id, patientId))
//       .orderBy(desc(vitals.createdAt));

//     // Logic: Map the DB fields back to the format your frontend expects (BP object)
//     const formattedHistory = history.map(row => ({
//       id: row.id,
//       createdAt: row.createdAt,
//       PulseRate: row.PulseRate,
//       Spo2: row.BloodOxygen,
//       Weight: row.Weight,
//       Height: row.Height,
//       Temperature: row.Temperature,
//       BP: {
//         value1: row.Systolic,
//         value2: row.Diastolic
//       }
//       // Temperature: row.Temperature (Only if you added it to your DB schema!)
//     }));

//     res.json({
//       success: true,
//       vitals: formattedHistory
//     });

//   } catch (err: any) {
//     console.error("Fetch Vitals Error:", err);
//     res.status(500).json({ error: "Internal Server Error", details: err.message });
//   }
// });

// export default router;



















// import { Router } from 'express';
// import { db } from '../db';
// import { all_entries, vitals } from '../db/schema';
// import { eq, desc, and } from 'drizzle-orm';
// import { authenticate } from '../middleware/auth';

// const router = Router();

// router.post('/add', authenticate, async (req: any, res: any) => {
//   try {
//     // 1. Extract data from request body
//     const { phoneNumber, firstName, lastName, father_husband, age, gender } = req.body;
    
//     // 2. Get the logged-in user's ID from the token (provided by middleware)
//     const userId = req.user.userId;

//     // 3. Validation: Check if required fields exist
//     if (!phoneNumber || !firstName || !lastName || !age || !gender) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     // 4. Insert into database
//     const newPatient = await db.insert(all_entries).values({
//       phoneNumber,
//       firstName,
//       lastName,
//       father_husband,
//       age,
//       gender,
//       user_id: userId // Linking patient to the staff member
//     }).returning();

//     // 5. Send success response
//     res.status(201).json({ 
//       success: true, 
//       message: "Patient added successfully", 
//       patientId: newPatient[0].id 
//     });

//   } catch (err: any) {
//     console.error("Database Error:", err);
//     res.status(500).json({ error: "Internal Server Error", details: err.message });
//   }
// });

// // GET: Find by phone
// router.get('/', authenticate, async (req, res) => {
//   const { phone } = req.query;
//   if (!phone) return res.status(400).json({ error: "Phone required" });

//   const [entry] = await db.select().from(all_entries)
//     .where(eq(all_entries.phoneNumber, phone as string))
//     .orderBy(desc(all_entries.createdAt))
//     .limit(1);

//   if (!entry) return res.status(404).json({ error: "Not found" });
//   res.json({ entryId: entry.id, fields: entry });
// });

// // POST: Add Patient Vitals
// router.post('/save-vitals', authenticate, async (req: any, res: any) => {
//   try {
//     const { patientId, vitals: v } = req.body;

//     // Logic Check: Ensure we actually have a patient to attach vitals to
//     if (!patientId) {
//       return res.status(400).json({ error: "Missing patient ID" });
//     }

//     // Insert into the 'vitals' table you defined in your schema
//     const newVital = await db.insert(vitals).values({
//       patient_id: patientId,
//       PulseRate: v.PulseRate,
//       BloodOxygen: v.Spo2,      // Note: mapping 'Spo2' from frontend to 'BloodOxygen' in DB
//       Systolic: v.BP.value1,    // value1 -> Systolic
//       Diastolic: v.BP.value2,
//       Temperature: v.Temperature,   // value2 -> Diastolic
//       Weight: v.Weight,
//       Height: v.Height,
//       // Temperature isn't in your schema! Add it to schema or ignore it for now.
//     }).returning();

//     res.status(201).json({ 
//       success: true, 
//       message: "Vitals recorded successfully", 
//       data: newVital[0] 
//     });

//   } catch (err: any) {
//     console.error("Vitals DB Error:", err);
//     res.status(500).json({ error: "Internal Server Error", details: err.message });
//   }
// });

// // POST: Save or Update
// router.post('/save', authenticate, async (req, res) => {
//   const { id, ...data } = req.body;
//   const userId = (req as any).user.userId;

//   try {
//     let result;
//     if (id) {
//       result = await db.update(all_entries).set({ ...data, user_id: userId })
//         .where(and(eq(all_entries.id, id), eq(all_entries.user_id, userId)))
//         .returning();
//     } else {
//       result = await db.insert(all_entries).values({ ...data, user_id: userId }).returning();
//     }
//     res.json({ success: true, entryId: result[0].id });
//   } catch (err) {
//     res.status(500).json({ error: "Database error" });
//   }
// });

// // GET: Get all entries (paginated)
// router.get('/all', authenticate, async (req, res) => {
//   try {
//     const entries = await db.select()
//       .from(all_entries)
//       .orderBy(desc(all_entries.createdAt))
//       .limit(50); // Don't return thousands of rows at once

//     res.json(entries);
//   } catch (err) {
//     res.status(500).json({ error: "Failed to fetch entries" });
//   }
// });

// // DELETE: Remove an entry
// router.delete('/:id', authenticate, async (req: any, res) => {
//   const { id } = req.params;
//   const userId = req.user.userId;

//   try {
//     const deleted = await db.delete(all_entries)
//       .where(and(eq(all_entries.id, id), eq(all_entries.user_id, userId)))
//       .returning();

//     if (deleted.length === 0) return res.status(404).json({ error: "Entry not found or unauthorized" });
    
//     res.json({ success: true, message: "Entry deleted" });
//   } catch (err) {
//     res.status(500).json({ error: "Delete failed" });
//   }
// });

// // GET: Fetch Vitals History for a specific patient
// router.get('/history/:patientId', authenticate, async (req: any, res: any) => {
//   try {
//     const { patientId } = req.params;

//     if (!patientId) {
//       return res.status(400).json({ error: "Patient ID is required" });
//     }

//     // Logic: Fetch all vitals linked to this patient, newest first
//     const history = await db.select()
//       .from(vitals)
//       .where(eq(vitals.patient_id, patientId))
//       .orderBy(desc(vitals.createdAt));

//     // Logic: Map the DB fields back to the format your frontend expects (BP object)
//     const formattedHistory = history.map(row => ({
//       id: row.id,
//       createdAt: row.createdAt,
//       PulseRate: row.PulseRate,
//       Spo2: row.BloodOxygen,
//       Weight: row.Weight,
//       Height: row.Height,
//       Temperature: row.Temperature,
//       BP: {
//         value1: row.Systolic,
//         value2: row.Diastolic
//       }
//       // Temperature: row.Temperature (Only if you added it to your DB schema!)
//     }));

//     res.json({
//       success: true,
//       vitals: formattedHistory
//     });

//   } catch (err: any) {
//     console.error("Fetch Vitals Error:", err);
//     res.status(500).json({ error: "Internal Server Error", details: err.message });
//   }
// });

// export default router;