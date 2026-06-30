import { Router } from 'express';
import { db } from '../db';
import { all_entries, vitals, rapid_testing, eye_testing, color_blind_testing, hearing_testing, prescriptions, prescription_medicines, doctors } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

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

    // 7. Get the prescription tied to this exact visit.
    // Match patient + token + same calendar date as the vitals record was created on.
    // (Token is unique per patient per day, and the prescription is always saved
    // during the same call session as the vitals row, so this triple is unambiguous
    // even if the patient has multiple visits/tokens/prescriptions on other dates.)
    const prescriptionConditions = [
      eq(prescriptions.patient_id, v.patient_id),
      eq(prescriptions.token, v.token ?? ''),
    ];
    if (v.createdDate) {
      prescriptionConditions.push(eq(prescriptions.prescriptionDate, v.createdDate));
    }

    const prescriptionRecord = await db
      .select()
      .from(prescriptions)
      .where(and(...prescriptionConditions))
      .orderBy(desc(prescriptions.prescriptionTime))
      .limit(1);

    let prescriptionData = null;
    if (prescriptionRecord.length) {
      const presc = prescriptionRecord[0];
      const medicines = await db
        .select()
        .from(prescription_medicines)
        .where(eq(prescription_medicines.prescription_id, presc.id));
      const docRows = await db.select().from(doctors).where(eq(doctors.id, presc.doctor_id)).limit(1);
      const doc = docRows[0];

      prescriptionData = {
        id: presc.id,
        diagnosis: presc.diagnosis,
        labTest: presc.labTest,
        clinicalNotes: presc.clinicalNotes,
        prescriptionDate: presc.prescriptionDate,
        prescriptionTime: presc.prescriptionTime,
        doctor: doc ? { name: `${doc.title} ${doc.firstName} ${doc.lastName}`, specializations: doc.specializations } : null,
        medicines: medicines.map(m => ({
          name: m.medicineName,
          dosage: m.dosage,
          duration: m.duration,
          morning: m.morning,
          afternoon: m.afternoon,
          night: m.night,
          beforeMeal: m.beforeMeal,
          afterMeal: m.afterMeal,
        })),
      };
    }

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
        prescription: prescriptionData,
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


//add and update email
// ── PATCH /api/report/patient-email/:patientId — update/add email ──
router.patch('/patient-email/:patientId', async (req: any, res: any) => {
  const { patientId } = req.params;
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Email required' });
  try {
    await db.update(all_entries).set({ email: email.trim() }).where(eq(all_entries.id, patientId));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update email', details: err.message });
  }
});

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

// ── POST /api/report/vitals/:vitalsId/send-email-pdf — send PDF attachment ──
router.post('/vitals/:vitalsId/send-email-pdf', async (req: any, res: any) => {
  try {
    const multer = await import('multer');
    const upload = multer.default({ storage: multer.default.memoryStorage() }).single('pdf');

    upload(req, res, async (err: any) => {
      if (err) return res.status(400).json({ success: false, error: 'File upload error' });

      const { email, patientName, token } = req.body;
      const pdfBuffer = req.file?.buffer;

      if (!email || !pdfBuffer) {
        return res.status(400).json({ success: false, error: 'Missing email or PDF' });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ success: false, error: 'Invalid email address' });
      }

      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });

      await transporter.sendMail({
        from: `"EZShifa Digital Health" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Vital Report — ${patientName ?? 'Patient'} (Token #${token ?? ''})`,
        text: `Dear ${patientName ?? 'Patient'},\n\nPlease find your vital report attached.\n\nEZShifa Digital Health`,
        attachments: [{
          filename: `${(patientName ?? 'Patient').replace(/ /g, '_')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }],
      });

      res.json({ success: true });
    });
  } catch (err: any) {
    console.error('SEND EMAIL PDF ERROR:', err);
    res.status(500).json({ success: false, error: 'Failed to send email', details: err.message });
  }
});

export default router;


