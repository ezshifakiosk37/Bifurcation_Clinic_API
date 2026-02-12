import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  // Header format: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).user = decoded; // Attach user info to the request
    next();
  } catch (err: any) {
    console.error("JWT Verification Failed:", err.message); // This will show in your terminal
    res.status(403).json({ 
      error: "Invalid or expired token", 
      message: err.message // This will show in Thunder Client
    });
  }
};