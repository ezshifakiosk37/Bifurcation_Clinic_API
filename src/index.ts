import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// fileUpload import REMOVED — it's now only in doctors.ts

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
import uploadRouter from './routes/upload';
import reportRoutes from './routes/report';

dotenv.config();

const app: Application = express();

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));

// NO global fileUpload middleware here

const PORT = process.env.PORT || 5000;

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', authenticate, patientRoutes);
app.use('/api/vitals', authenticate, vitalRoutes);
app.use('/api/doc-auth', docAuthRouter);
app.use('/api/medicines', authenticate, medicineRoutes);
app.use("/api/video", videoRoutes);
app.use("/api/agoravideo", agoraVideoRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/upload', uploadRouter);
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Production server is live on port ${PORT}`);
});