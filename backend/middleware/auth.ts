import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('[SECURITY FATAL] JWT_SECRET is not defined in .env! Backend cannot start securely.');
  process.exit(1);
}

const parseCookies = (cookieHeader: string): Record<string, string> => {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts[0].trim();
    if (name) {
      cookies[name] = parts.slice(1).join('=').trim();
    }
  });
  return cookies;
};

export const authenticateToken = (req: any, res: Response, next: NextFunction) => {
  let token = null;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token && req.headers.cookie) {
    const cookies = parseCookies(req.headers.cookie);
    token = cookies['token'];
  }

  if (token == null) return res.status(401).json({ error: 'Unauthorized' });

  req.token = token;

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
