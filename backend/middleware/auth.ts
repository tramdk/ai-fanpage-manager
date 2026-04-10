import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authenticateToken = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    
    try {
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      req.user = { ...decoded, requirePasswordChange: user.requirePasswordChange };
      
      // If password change is required, block all requests except password update and identity check
      if (user.requirePasswordChange && req.path !== '/api/users/password' && req.path !== '/api/auth/me') {
        return res.status(403).json({ 
          error: 'Password change required', 
          requirePasswordChange: true 
        });
      }
      
      next();
    } catch (e) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

export const authenticateAdmin = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
