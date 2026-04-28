import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload';
import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import vitalRoutes from './routes/vitals';
import medicineRoutes from './routes/medicines';
import { authenticate } from './middleware/auth';
import docAuthRouter from './routes/docAuth';
import doctorRoutes from './routes/doctors';
import videoRoutes from "./routes/video";
import agoraVideoRoutes from "./routes/agoravideo";
import notificationRoutes from "./routes/notifications";

// 1. Load Environment Variables early
dotenv.config();

const app: Application = express();

// --- CRITICAL: MANUAL CORS & PREFLIGHT HANDLER ---
// This must be the FIRST middleware to ensure Vercel doesn't block the request.
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle the Preflight (OPTIONS) request immediately
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json());

app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 5 * 1024 * 1024 },
  abortOnLimit: true,
  useTempFiles: false,
  debug: false,
}));

const PORT = process.env.PORT || 5000;

// 2. Standard CORS (Backup for specific route logic)
app.use(cors({
  origin: true,
  credentials: true
}));

// 4. Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// 5. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', authenticate, patientRoutes);
app.use('/api/vitals', authenticate, vitalRoutes);
app.use('/api/doc-auth', docAuthRouter);
app.use('/api/medicines', authenticate, medicineRoutes);
app.use("/api/video", videoRoutes);
app.use("/api/agoravideo", agoraVideoRoutes);
app.use('/api/notifications', notificationRoutes);

// 6. Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 7. Start Server on 0.0.0.0
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Production server is live on port ${PORT}`);
});