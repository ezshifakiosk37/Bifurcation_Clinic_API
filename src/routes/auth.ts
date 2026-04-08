// routes/auth.ts
import { Router } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

    // DANGEROUS: Direct comparison of plain text
    if (!user || password !== user.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    res.json({ success: true, token, user: { id: user.id, username: user.username } });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;