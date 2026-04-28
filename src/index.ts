import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload';

// Route Imports
import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import vitalRoutes from './routes/vitals';
import medicineRoutes from './routes/medicines';
import { authenticate } from './middleware/auth';
import docAuthRouter from './routes/docAuth'; 
import doctorRoutes from './routes/doctors'; 
import videoRoutes from "./routes/video";
import agoraVideoRoutes from "./routes/agoravideo";
import notificationRoutes from "./routes/notifications"; // Ensure this is fixed in its own file!

// 1. Load Environment Variables
dotenv.config();

const app: Application = express();

// --- CRITICAL: MANUAL CORS & PREFLIGHT HANDLER ---
// This must be the FIRST middleware. Vercel often fails to pass CORS headers 
// on a 500 crash unless they are set manually here.
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Immediately respond to the browser's "Is it okay to talk?" request
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 2. Standard Parsers
app.use(express.json());
app.use(cors({ origin: true, credentials: true })); // Redundant but safe backup

app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 5 * 1024 * 1024 },
  abortOnLimit: true,
  useTempFiles: false,
  debug: false,
}));

const PORT = process.env.PORT || 5000;

// 3. Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// 4. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', authenticate, patientRoutes);
app.use('/api/vitals', authenticate, vitalRoutes);
app.use('/api/doc-auth', docAuthRouter);
app.use('/api/medicines', authenticate, medicineRoutes);
app.use("/api/video", videoRoutes);
app.use("/api/agoravideo", agoraVideoRoutes);
app.use('/api/notifications', notificationRoutes); // The "Crash Point"

// 5. Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// 6. Start Server
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Production server is live on port ${PORT}`);
});