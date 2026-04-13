// routes/doctors.ts
import { Router,Request,Response } from 'express';
import { db } from '../db';
import { doctors,doctor_logs } from '../db/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import fileUpload from 'express-fileupload';   // ← Added
import { authenticate } from '../middleware/auth';

const router = Router();

// // ─────────────────────────────────────────────
// // FILE UPLOAD SETUP (replaces multer)
// // ─────────────────────────────────────────────
// router.use(fileUpload({
//   createParentPath: true,        // auto create folders
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
//   abortOnLimit: true,
//   useTempFiles: false,
// }));

// ─────────────────────────────────────────────
// HELPER: doc authenticate middleware
// ─────────────────────────────────────────────
export const authenticateDoctor = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.doctor = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ─────────────────────────────────────────────
// DATE/TIME HELPER
// ─────────────────────────────────────────────
const getNow = () => {
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(now);
  return { date, time };
};

// ─────────────────────────────────────────────
// 1. REGISTER DOCTOR
// POST /api/doctors/register
// ─────────────────────────────────────────────
router.post('/register', authenticate, async (req: any, res: Response) => {
  const {
    title, firstName, lastName, email, password,
    phone, gender, experience, city,
    specializations, qualifications,
  } = req.body;

  const staffUserId = req.user.userId; // extracted from staff JWT token automatically

  if (!title || !firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  try {
    // Check duplicate email
    const [existing] = await db.select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.email, email))
      .limit(1);

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const { date, time } = getNow();

    // Handle photo upload (replaces multer)
    let photoPath: string | null = null;
    if (req.files?.photo) {
      const photo = req.files.photo as fileUpload.UploadedFile;
      
      const dir = 'uploads/doctors';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const fileName = `${unique}${path.extname(photo.name)}`;
      const fullPath = path.join(dir, fileName);

      await photo.mv(fullPath);   // moves the file
      photoPath = `/uploads/doctors/${fileName}`;
    }

    const safeSpecs = (() => {
      try { return JSON.parse(specializations); } catch { return []; }
    })();
    const safeQuals = (() => {
      try { return JSON.parse(qualifications); } catch { return []; }
    })();

    const [newDoctor] = await db.insert(doctors).values({
      title,
      firstName,
      lastName,
      email,
      password,
      phone: phone || null,
      gender: gender || null,
      photo: photoPath,
      specializations: safeSpecs,
      qualifications: safeQuals,
      experience: parseInt(experience) || 0,
      city: city || null,
      user_id: staffUserId,
      createdDate: date,
      createdTime: time,
      updatedDate: date,
      updatedTime: time,
    }).returning();

    const token = jwt.sign(
      { doctorId: newDoctor.id, email: newDoctor.email },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      token,
      doctor: {
        id: newDoctor.id,
        title: newDoctor.title,
        firstName: newDoctor.firstName,
        lastName: newDoctor.lastName,
        email: newDoctor.email,
        phone: newDoctor.phone,
        gender: newDoctor.gender,
        photo: newDoctor.photo,
        specializations: newDoctor.specializations,
        qualifications: newDoctor.qualifications,
        experience: newDoctor.experience,
        city: newDoctor.city,
      },
    });

  } catch (err: any) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

// ─────────────────────────────────────────────
// 2. UPDATE DOCTOR PROFILE (unchanged)
// ─────────────────────────────────────────────
router.put('/update/:id', authenticateDoctor, async (req: any, res: any) => {
  const { id } = req.params;

  if (req.doctor.doctorId !== id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const {
    title, firstName, lastName, email,
    password, phone, gender,
    specializations, qualifications,
    experience, city,
  } = req.body;

  try {
    const { date, time } = getNow();

    const [updated] = await db.update(doctors)
      .set({
        ...(title       && { title }),
        ...(firstName   && { firstName }),
        ...(lastName    && { lastName }),
        ...(email       && { email }),
        ...(password    && { password }),
        ...(phone       && { phone }),
        ...(gender      && { gender }),
        ...(specializations && { specializations }),
        ...(qualifications  && { qualifications }),
        ...(experience !== undefined && { experience: parseInt(experience) || 0 }),
        ...(city        && { city }),
        updatedDate: date,
        updatedTime: time,
      })
      .where(eq(doctors.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json({
      success: true,
      doctor: {
        id: updated.id,
        title: updated.title,
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        phone: updated.phone,
        gender: updated.gender,
        photo: updated.photo,
        specializations: updated.specializations,
        qualifications: updated.qualifications,
        experience: updated.experience,
        city: updated.city,
      },
    });

  } catch (err: any) {
    console.error('UPDATE ERROR:', err);
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
});

// ─────────────────────────────────────────────
// 3. GET DOCTOR PROFILE (unchanged)
// ─────────────────────────────────────────────
router.get('/me', authenticateDoctor, async (req: any, res: any) => {
  try {
    const [doctor] = await db.select()
      .from(doctors)
      .where(eq(doctors.id, req.doctor.doctorId))
      .limit(1);

    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const { password: _, ...safeDoctor } = doctor;
    res.json({ success: true, doctor: safeDoctor });

  } catch (err: any) {
    console.error('GET ME ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch profile', details: err.message });
  }
});

// ─────────────────────────────────────────────
// 4. DOCTOR LOGOUT WITH REASON
// ─────────────────────────────────────────────
router.post('/logout', authenticateDoctor, async (req: any, res: any) => {
  const { reason } = req.body;
  const doctorId = req.doctor.doctorId;

  if (!reason) {
    return res.status(400).json({ error: "Logout reason is required" });
  }

  const { date, time } = getNow();

  try {
    await db.insert(doctor_logs).values({
      doctor_id: doctorId,
      action: "logout",
      reason: reason,
      createdDate: date,
      createdTime: time,
    });

    res.json({ success: true, message: "Logout reason saved" });
  } catch (err: any) {
    console.error("LOGOUT LOG ERROR:", err);
    res.status(500).json({ error: "Failed to save logout reason" });
  }
});
export default router;
export { authenticateDoctor as docAuth };