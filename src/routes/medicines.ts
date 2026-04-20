import { Router, Response } from 'express';
import { db } from '../db';
import { medicine_inventry } from '../db/schema';
import { authenticate } from '../middleware/auth'; // Or authenticateDoctor depending on who needs access

const router = Router();

// ─────────────────────────────────────────────
// GET ALL MEDICINES
// GET /api/medicines
// ─────────────────────────────────────────────
router.get('/', authenticate, async (req: any, res: Response) => {
  try {
    // Select all columns from the inventory table
    const medicines = await db
      .select()
      .from(medicine_inventry);

    // If the table is empty, we still return a 200 with an empty array
    res.status(200).json({
      success: true,
      count: medicines.length,
      data: medicines,
    });

  } catch (err: any) {
    console.error('FETCH MEDICINES ERROR:', err);
    res.status(500).json({ 
      error: 'Failed to fetch medicines from inventory', 
      details: err.message 
    });
  }
});

export default router;