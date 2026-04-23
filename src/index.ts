import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload';
import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import vitalRoutes from './routes/vitals';
import medicineRoutes from './routes/medicines'
import { authenticate } from './middleware/auth';
import docAuthRouter from './routes/docAuth'; //doc login
import doctorRoutes from './routes/doctors'; //doctor.ts
import videoRoutes from "./routes/video";

// 1. Load Environment Variables early
dotenv.config();

const app: Application = express();

app.use(fileUpload({
  createParentPath: true,        // Automatically creates 'uploads/doctors' folder
  limits: { 
    fileSize: 5 * 1024 * 1024    // 5MB limit
  },
  abortOnLimit: true,
  useTempFiles: false,
  debug: false,                  // Change to true only if you want debug logs
}));

// 2. Dynamic Port for Cloud Providers
// Cloud platforms like Render/Railway inject the PORT variable automatically.
const PORT = process.env.PORT || 5000;

// 3. Production Middleware
app.use(cors({
  origin: '*', // For Electron apps, '*' is often necessary, but you can restrict this later
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 4. Health Check Route
// Crucial for production to verify the service is "Alive" without hitting the DB
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// 5. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes); //doctor.ts
app.use('/api/patients', authenticate, patientRoutes);
app.use('/api/vitals', authenticate, vitalRoutes);
app.use('/api/doc-auth', docAuthRouter);    //Doctor login
app.use('/api/medicines', authenticate, medicineRoutes);
app.use("/api/video", videoRoutes);

// 6. Global Error Handler
// Prevents the server from crashing and leaking stack traces to users
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 7. Start Server on 0.0.0.0
// "0.0.0.0" is essential for Docker and many cloud environments to accept outside traffic
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Production server is live on port ${PORT}`);
});



// import express, { Application } from 'express';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import authRoutes from './routes/auth';
// import patientRoutes from './routes/patients';
// import vitalRoutes from './routes/vitals';
// import { authenticate } from './middleware/auth';
// import docAuthRouter from './routes/docAuth'; //doc login
// // import doctorRoutes from './routes/doctors'; //doctor.ts

// // 1. Load Environment Variables early
// dotenv.config();

// const app: Application = express();

// // 2. Dynamic Port for Cloud Providers
// // Cloud platforms like Render/Railway inject the PORT variable automatically.
// const PORT = process.env.PORT || 5000;

// // 3. Production Middleware
// app.use(cors({
//   origin: '*', // For Electron apps, '*' is often necessary, but you can restrict this later
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

// app.use(express.json());

// // 4. Health Check Route
// // Crucial for production to verify the service is "Alive" without hitting the DB
// app.get('/health', (req, res) => {
//   res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
// });

// // 5. API Routes
// app.use('/api/auth', authRoutes);
// // app.use('/api/doctors', doctorRoutes); //doctor.ts
// app.use('/api/patients', authenticate, patientRoutes);
// app.use('/api/vitals', authenticate, vitalRoutes);
// app.use('/api/doc-auth', docAuthRouter);    //Doctor login
// // 6. Global Error Handler
// // Prevents the server from crashing and leaking stack traces to users
// app.use((err: any, req: any, res: any, next: any) => {
//   console.error('Unhandled Error:', err);
//   res.status(500).json({ error: 'Internal Server Error' });
// });

// // 7. Start Server on 0.0.0.0
// // "0.0.0.0" is essential for Docker and many cloud environments to accept outside traffic
// app.listen(Number(PORT), '0.0.0.0', () => {
//   console.log(`🚀 Production server is live on port ${PORT}`);
// });