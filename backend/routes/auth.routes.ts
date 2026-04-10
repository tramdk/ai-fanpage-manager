import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

router.post('/register', async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) return res.status(400).json({ error: 'User already exists' });

      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: { email, password: hashedPassword, name }
      });
      res.json({ message: 'Registration successful. Wait for activation.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.post('/setup-password', async (req, res) => {
    const { setupToken, newPassword } = req.body;
    if (!setupToken || !newPassword) return res.status(400).json({ error: 'Missing required fields' });

    try {
      const decoded = jwt.verify(setupToken, JWT_SECRET) as any;
      if (!decoded.isSetup) return res.status(401).json({ error: 'Invalid token type' });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: decoded.id },
        data: { password: hashedPassword, requirePasswordChange: false }
      });
      res.json({ message: 'Security protocol completed.' });
    } catch (error: any) {
      res.status(401).json({ error: 'Session expired or invalid' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(400).json({ error: 'Invalid credentials' });

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

      const defaultAdminEmail = process.env.ADMIN_EMAIL || 'admin@floral.com';
      const defaultAdminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const tempPassword = 'password@123';

      const isDefaultRoot = (email === defaultAdminEmail && password === defaultAdminPassword);
      const isTempPassword = (password === tempPassword && user.requirePasswordChange);

      if (isDefaultRoot || isTempPassword) {
         const setupToken = jwt.sign({ id: user.id, isSetup: true }, JWT_SECRET, { expiresIn: '15m' });
         return res.status(403).json({ error: 'PASSWORD_CHANGE_REQUIRED', setupToken, user: { id: user.id, email: user.email, name: user.name } });
      }

      if (!user.isActive && user.role !== 'admin') {
        return res.status(403).json({ error: 'Account is pending activation.' });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.get('/me', authenticateToken, async (req: any, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

export default router;
