// // routes/auth.ts
// routes/auth.ts
import { Router } from 'express';
import { db } from '../db';
import { users, doctors, doctor_logs } from '../db/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    // ── Try staff table first (login by username) ──
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (user && password === user.password) {
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET!,
        { expiresIn: '30d' }
      );
      return res.json({
        success: true,
        role: 'staff',
        token,
        user: { id: user.id, username: user.username },
      });
    }

    // ── Try doctors table (login by email, username field holds email) ──
    const [doctor] = await db.select().from(doctors).where(eq(doctors.email, username)).limit(1);

    if (doctor && password === doctor.password) {
      const token = jwt.sign(
        { doctorId: doctor.id, email: doctor.email, name: `${doctor.title} ${doctor.firstName} ${doctor.lastName}` },
        process.env.JWT_SECRET!,
        { expiresIn: '30d' }
      );

      // Log login + set online
      const now = new Date();
      const logDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
      const logTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
      await db.insert(doctor_logs).values({ doctor_id: doctor.id, action: 'login', reason: 'online', createdDate: logDate, createdTime: logTime });
      await db.update(doctors).set({ doctorStatus: 'online', updatedDate: logDate, updatedTime: logTime }).where(eq(doctors.id, doctor.id));

      return res.json({
        success: true,
        role: 'doctor',
        doc_token: token,
        doctor: {
          id: doctor.id, title: doctor.title, firstName: doctor.firstName,
          lastName: doctor.lastName, email: doctor.email, phone: doctor.phone,
          gender: doctor.gender, photo: doctor.photo,
          specializations: doctor.specializations, qualifications: doctor.qualifications,
          experience: doctor.experience, city: doctor.city,
        },
      });
    }

    return res.status(401).json({ error: "Invalid credentials" });

  } catch (err: any) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (!decoded.userId) {
      return res.status(403).json({ error: 'Not a staff token' });
    }

    const [user] = await db
      .select({
        id:       users.id,
        username: users.username,
        name:     users.name,
        location: users.location,
        country:  users.country,
        city:     users.city,
        province: users.province,
      })
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({ success: true, user });
  } catch (err: any) {
    console.error('GET /me ERROR:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
});
export default router;
// import { Router } from 'express';
// import { db } from '../db';
// import { users } from '../db/schema';
// import { eq } from 'drizzle-orm';
// import jwt from 'jsonwebtoken';

// const router = Router();

// router.post('/login', async (req, res) => {
//   const { username, password } = req.body;
  
//   try {
//     const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

//     // DANGEROUS: Direct comparison of plain text
//     if (!user || password !== user.password) {
//       return res.status(401).json({ error: "Invalid credentials" });
//     }

//     const token = jwt.sign(
//       { userId: user.id, username: user.username },
//       process.env.JWT_SECRET!,
//       { expiresIn: '30d' }
//     );

//     res.json({ success: true, token, user: { id: user.id, username: user.username } });
//   } catch (err) {
//     res.status(500).json({ error: "Server error" });
//   }
// });

// export default router;