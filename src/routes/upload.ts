import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { authenticate } from '../middleware/auth';

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// Temporary debug — remove after fixing
console.log('☁️ Cloudinary ENV check:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET ? '✅ SET' : '❌ MISSING',
});
const router = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

router.post('/patient-photo', authenticate, upload.single('photo'), async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'patient-photos', transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }] },
        (error, result) => { if (error) reject(error); else resolve(result); }
      ).end(req.file!.buffer);
    });

    res.json({ success: true, url: result.secure_url, publicId: result.public_id });
  } catch (err: any) {
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});


router.post('/ecg-report', authenticate, upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // 1. Get patient info from the request body
    const patientName = req.body.patientName || 'unknown';
    const patientPhone = req.body.patientPhone || 'unknown';

    // 2. Sanitize: remove special chars, replace spaces with underscores
    const sanitize = (str: string) =>
      str.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50); // limit length

    const safeName = sanitize(patientName);
    const safePhone = sanitize(patientPhone);
    const timestamp = Date.now();

    // 3. Build a unique public_id
    const publicId = `ecg_reports/${safeName}_${timestamp}_${safePhone}.pdf`;

    // 4. Upload to Cloudinary with this public_id
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          public_id: publicId,      // full path including folder
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (err: any) {
    console.error('ECG upload error:', err);
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});


export default router;