import { Router } from 'express';
import { db } from '../db';
import { all_entries, vitals, rapid_testing, eye_testing, color_blind_testing, hearing_testing } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/vitals/:vitalsId', async (req, res) => {
  const { vitalsId } = req.params;

  try {
    // 1. Get vitals
    const vitalsRecord = await db.select().from(vitals).where(eq(vitals.id, vitalsId)).limit(1);
    if (!vitalsRecord.length) {
      return res.status(404).json({ success: false, error: 'Vitals not found' });
    }
    const v = vitalsRecord[0];

    // 2. Get patient
    const patient = await db.select().from(all_entries).where(eq(all_entries.id, v.patient_id)).limit(1);
    if (!patient.length) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }
    const p = patient[0];

    // 3. Get rapid testing (if exists)
    const rapid = await db.select().from(rapid_testing).where(eq(rapid_testing.vitals_id, vitalsId)).limit(1);
    // 4. Get eye testing
    const eye = await db.select().from(eye_testing).where(eq(eye_testing.vitals_id, vitalsId)).limit(1);
    // 5. Get color blind testing
    const colorBlind = await db.select().from(color_blind_testing).where(eq(color_blind_testing.vitals_id, vitalsId)).limit(1);
    // 6. Get hearing testing
    const hearing = await db.select().from(hearing_testing).where(eq(hearing_testing.vitals_id, vitalsId)).limit(1);

    // Build response
    const reportData = {
      success: true,
      data: {
        patient: {
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          age: p.age,
          gender: p.gender,
          phone: p.phoneNumber,
          token: p.token,
          createdDate: v.createdDate,
        },
        vitals: {
          PulseRate: v.PulseRate,
          BloodOxygen: v.BloodOxygen,
          Systolic: v.Systolic,
          Diastolic: v.Diastolic,
          Temperature: v.Temperature,
          temperatureUnit: v.temperatureUnit,
          Weight: v.Weight,
          Height: v.Height,
          heightUnit: v.heightUnit,
          symptoms: v.symptoms,
          bmi: v.bmi,
        },
        rapidTesting: rapid[0] || null,
        eyeTesting: eye[0] || null,
        colorBlindTesting: colorBlind[0] || null,
        hearingTesting: hearing[0] || null,
      }
    };

    return res.json(reportData);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});
// for sending vital report via email 
// ── GET /api/report/patient-email/:patientId ──
router.get('/patient-email/:patientId', async (req: any, res: any) => {
  const { patientId } = req.params;
  try {
    const [patient] = await db
      .select({ email: all_entries.email })
      .from(all_entries)
      .where(eq(all_entries.id, patientId))
      .limit(1);

    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

    const email =
      patient.email && patient.email.trim() !== '' && patient.email.toLowerCase() !== 'null'
        ? patient.email.trim()
        : null;

    res.json({ success: true, email });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch email', details: err.message });
  }
});

// ── POST /api/report/vitals/:vitalsId/send-email ──
router.post('/vitals/:vitalsId/send-email', async (req: any, res: any) => {
  const { email, payload } = req.body;
  if (!email || !payload) return res.status(400).json({ success: false, error: 'Missing email or payload' });

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const sectionsText = (payload.reportSections as string[]).join('\n\n');

    await transporter.sendMail({
      from: `"EZShifa Digital Health" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Vital Report — ${payload.patient?.name ?? 'Patient'} (Token #${payload.token})`,
      text: `EZShifa Digital Health\nVital Report\n\nName: ${payload.patient?.name}\nPhone: ${payload.patient?.phone}\nAge/Sex: ${payload.patient?.ageSex}\nToken: #${payload.token}\nDate: ${payload.date}\n\n${sectionsText}\n\nThis report is from EZShifa Digital Health.`,
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('SEND EMAIL ERROR:', err);
    res.status(500).json({ success: false, error: 'Failed to send email', details: err.message });
  }
});

export default router;
