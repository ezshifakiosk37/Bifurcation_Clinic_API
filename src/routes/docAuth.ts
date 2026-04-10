// routes/docAuth.ts
import { Router } from 'express';
import { db } from '../db';
import { doctors } from '../db/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const router = Router();

// --- DOCTOR LOGIN ---
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const [doctor] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.email, email))
      .limit(1);

    if (!doctor || password !== doctor.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        doctorId: doctor.id,
        email: doctor.email,
        name: `${doctor.title} ${doctor.firstName} ${doctor.lastName}`,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      doctor: {
        id: doctor.id,
        title: doctor.title,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        email: doctor.email,
        phone: doctor.phone,
        gender: doctor.gender,
        photo: doctor.photo,
        specializations: doctor.specializations,
        qualifications: doctor.qualifications,
        experience: doctor.experience,
        city: doctor.city,
      },
    });
  } catch (err: any) {
    console.error("DOC LOGIN ERROR:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

export default router;