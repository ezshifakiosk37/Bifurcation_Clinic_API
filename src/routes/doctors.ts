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
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-strong-secret-key-2026-change-in-prod';

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

  return { date: pktDate, time: pktTime };
};

// ====================== 1. REGISTER DOCTOR (PUBLIC) ======================
router.post('/register', async (req, res) => {
  const { title, firstName, lastName, email, password, phone, gender, specializations, qualifications, experience, city, photo } = req.body;

  try {
    const existing = await db.select().from(doctors).where(eq(doctors.email, email)).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.insert(doctors).values({
      title: title || 'Dr.',
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone: phone || null,
      gender: gender || null,
      photo: photo || null,
      specializations: specializations || [],
      qualifications: qualifications || [],
      experience: experience || 0,
      city: city || null,
    });

    res.status(201).json({ 
      success: true, 
      message: "Doctor registered successfully. Please login." 
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ====================== 2. LOGIN DOCTOR (PUBLIC) ======================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [doctor] = await db.select().from(doctors).where(eq(doctors.email, email)).limit(1);
    if (!doctor) return res.status(401).json({ success: false, error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) return res.status(401).json({ success: false, error: "Invalid credentials" });

    const token = jwt.sign(
      { doctorId: doctor.id, email: doctor.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      doctor: { ...doctor, password: undefined }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ====================== 3. PROTECTED ROUTES ======================

// Get Doctor Profile
router.get('/profile', authenticate, async (req: any, res) => {
  try {
    const [doctor] = await db.select().from(doctors)
      .where(eq(doctors.id, req.user.doctorId))
      .limit(1);

    if (!doctor) return res.status(404).json({ success: false, error: "Doctor not found" });

    res.json({ success: true, doctor: { ...doctor, password: undefined } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Doctor Profile
router.put('/profile', authenticate, async (req: any, res) => {
  const doctorId = req.user.doctorId;
  const { title, firstName, lastName, phone, gender, specializations, qualifications, experience, city, photo } = req.body;

  try {
    const [updated] = await db.update(doctors)
      .set({
        title,
        firstName,
        lastName,
        phone,
        gender,
        specializations,
        qualifications,
        experience: experience !== undefined ? experience : undefined,
        city,
        photo,
        updatedDate: getNow().date,
        updatedTime: getNow().time,
      })
      .where(eq(doctors.id, doctorId))
      .returning();

    res.json({ success: true, doctor: { ...updated, password: undefined } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ====================== DASHBOARD STATS ======================
router.get('/stats', authenticate, async (req: any, res) => {
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

// ====================== TODAY'S QUEUE ======================
router.get('/queue', authenticate, async (req: any, res) => {
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

// ====================== GET PATIENT FOR CONSULTATION ======================
router.get('/patient/:patientId', authenticate, async (req, res) => {
  const patientId = req.params.patientId as string;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());

  try {
    const [patient] = await db
      .select()
      .from(all_entries)
      .where(eq(all_entries.id, String(patientId)))
      .limit(1);

    if (!patient) {
      return res.status(404).json({ success: false, error: "Patient not found" });
    }

    const [todayVitals] = await db
      .select()
      .from(vitals)
      .where(
        and(
          eq(vitals.patient_id, String(patientId)),
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

// ====================== SAVE PRESCRIPTION (Supports End Session) ======================
router.post('/prescription', authenticate, async (req: any, res) => {
  const { patientId, token, diagnosis, clinicalNotes, medicines } = req.body;
  const doctorId = req.user.doctorId;

  if (!patientId || !doctorId || !token) {
    return res.status(400).json({ success: false, error: "Missing patientId, doctorId or token" });
  }

  const { date, time } = getNow();

  try {
    const [newPrescription] = await db.insert(prescriptions).values({
      patient_id: patientId,
      doctor_id: doctorId,
      token,
      prescriptionDate: date,
      prescriptionTime: time,
      diagnosis: diagnosis || "No diagnosis provided",
      clinicalNotes: clinicalNotes || "Session ended without notes",
      createdDate: date,
      createdTime: time,
    }).returning({ id: prescriptions.id });

    const prescriptionId = newPrescription.id;

    // Allow empty medicines (for "End Session" button)
    const medicineValues = Array.isArray(medicines) && medicines.length > 0
      ? medicines.map((med: any) => ({
          prescription_id: prescriptionId,
          medicineName: med.medicineName || med.name || "No medicine",
          morning: Boolean(med.morning),
          afternoon: Boolean(med.afternoon),
          night: Boolean(med.night),
          beforeMeal: Boolean(med.beforeMeal),
          afterMeal: Boolean(med.afterMeal ?? true),
        }))
      : [{
          prescription_id: prescriptionId,
          medicineName: "No medicine prescribed",
          morning: false,
          afternoon: false,
          night: false,
          beforeMeal: false,
          afterMeal: true,
        }];

    await db.insert(prescription_medicines).values(medicineValues);

    // Mark patient as completed
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