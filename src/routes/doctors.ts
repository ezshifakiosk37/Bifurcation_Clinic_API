// routes/doctors.ts
import { Router } from 'express';
import { db } from '../db';
import { 
  all_entries, 
  vitals, 
  doctors, 
  prescriptions, 
  prescription_medicines 
} from '../db/schema';

import { eq, and, desc, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';

const router = Router();

// ====================== HELPER: Get Current Date & Time (Pakistan Time) ======================
const getNow = () => {
  const now = new Date();

  const pktDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const pktTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);

  return { 
    date: pktDate,   
    time: pktTime    
  };
};

// ====================== 1. DASHBOARD STATS ======================
router.get('/stats', authenticate, async (req: any, res: any) => {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit'
  }).format(new Date());

  try {
    const totalPatients = await db
      .select({ count: sql<number>`count(*)` })
      .from(all_entries)
      .where(eq(all_entries.tokenDate, today));

    const inQueue = await db
      .select({ count: sql<number>`count(*)` })
      .from(all_entries)
      .where(
        and(
          eq(all_entries.tokenDate, today),
          sql`${all_entries.vitalsRecorded} = false`
        )
      );

    const completed = await db
      .select({ count: sql<number>`count(*)` })
      .from(prescriptions)
      .where(eq(prescriptions.prescriptionDate, today));

    res.json({
      success: true,
      data: {
        totalPatients: Number(totalPatients[0]?.count || 0),
        inQueue: Number(inQueue[0]?.count || 0),
        completed: Number(completed[0]?.count || 0),
      }
    });
  } catch (err: any) {
    console.error("Stats Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ====================== 2. TODAY'S QUEUE ======================
router.get('/queue', authenticate, async (req: any, res: any) => {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());

  try {
    const queueList = await db
      .select({
        id: all_entries.id,
        token: all_entries.token,
        firstName: all_entries.firstName,
        lastName: all_entries.lastName,
        age: all_entries.age,
        gender: all_entries.gender,
        symptoms: vitals.symptoms,
      })
      .from(all_entries)
      .leftJoin(vitals, and(
        eq(vitals.patient_id, all_entries.id),
        eq(vitals.createdDate, today)
      ))
      .where(
        and(
          eq(all_entries.tokenDate, today),
          sql`${all_entries.vitalsRecorded} = false`
        )
      )
      .orderBy(desc(all_entries.token));

    res.json({ success: true, queue: queueList });
  } catch (err: any) {
    console.error("Queue Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ====================== 3. GET PATIENT DETAIL FOR CONSULTATION ======================
// FIXED VERSION
router.get('/patient/:patientId', authenticate, async (req, res) => {
  const patientId = req.params.patientId as string;   // ← Explicit cast
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());

  try {
    // Fixed: Use sql template or String() to avoid type error
    const [patient] = await db
      .select()
      .from(all_entries)
      .where(eq(all_entries.id, String(patientId)))   // ← Fixed here
      .limit(1);

    if (!patient) {
      return res.status(404).json({ success: false, error: "Patient not found" });
    }

    // Get today's vitals (latest one)
    const [todayVitals] = await db
      .select()
      .from(vitals)
      .where(
        and(
          eq(vitals.patient_id, String(patientId)),     // ← Fixed here
          eq(vitals.createdDate, today)
        )
      )
      .orderBy(desc(vitals.createdTime))
      .limit(1);

    res.json({
      success: true,
      patient,
      vitals: todayVitals || null,
    });
  } catch (err: any) {
    console.error("Patient Detail Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ====================== 4. SAVE PRESCRIPTION ======================
router.post('/prescription', authenticate, async (req: any, res: any) => {
  const { 
    patientId, 
    token,
    diagnosis, 
    clinicalNotes, 
    medicines 
  } = req.body;

  const doctorId = req.user?.doctorId || req.user?.id;

  if (!patientId || !doctorId || !token) {
    return res.status(400).json({ success: false, error: "Missing patientId, doctorId or token" });
  }

  if (!Array.isArray(medicines) || medicines.length === 0) {
    return res.status(400).json({ success: false, error: "At least one medicine is required" });
  }

  const { date, time } = getNow();

  try {
    const [newPrescription] = await db.insert(prescriptions).values({
      patient_id: patientId,
      doctor_id: doctorId,
      token: token,
      prescriptionDate: date,
      prescriptionTime: time,
      diagnosis: diagnosis || null,
      clinicalNotes: clinicalNotes || null,
      createdDate: date,
      createdTime: time,
    }).returning({ id: prescriptions.id });

    const prescriptionId = newPrescription.id;

    const medicineValues = medicines.map((med: any) => ({
      prescription_id: prescriptionId,
      medicineName: med.medicineName || med.name,
      morning: Boolean(med.morning),
      afternoon: Boolean(med.afternoon),
      night: Boolean(med.night),
      beforeMeal: Boolean(med.beforeMeal),
      afterMeal: Boolean(med.afterMeal ?? true),
      dosage: med.dosage || null,
      duration: med.duration || null,
    }));

    await db.insert(prescription_medicines).values(medicineValues);

    await db.update(all_entries)
      .set({ vitalsRecorded: true })
      .where(eq(all_entries.id, patientId));

    res.json({
      success: true,
      prescriptionId,
      message: "Prescription saved successfully"
    });

  } catch (err: any) {
    console.error("Save Prescription Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;