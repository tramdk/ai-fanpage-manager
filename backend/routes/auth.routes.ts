import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as authService from '../services/auth.service.js';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  try {
    const result = await authService.register(email, password, name);
    res.json(result);
  } catch (error: any) {
    if (error.message === 'USER_EXISTS') return res.status(400).json({ error: 'User already exists' });
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  try {
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error: any) {
    if (error.message === 'INVALID_CREDENTIALS') return res.status(400).json({ error: 'Invalid credentials' });
    if (error.message === 'ACCOUNT_INACTIVE') return res.status(403).json({ error: 'Account is pending activation.' });
    if (error.message === 'PASSWORD_CHANGE_REQUIRED') return res.status(403).json({ error: 'PASSWORD_CHANGE_REQUIRED', setupToken: error.setupToken, user: error.user });
    res.status(500).json({ error: error.message });
  }
});

router.post('/setup-password', async (req, res) => {
  const { setupToken, newPassword } = req.body;
  if (!setupToken || !newPassword) return res.status(400).json({ error: 'Missing required fields' });
  try {
    const result = await authService.setupPassword(setupToken, newPassword);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: 'Session expired or invalid' });
  }
});

router.get('/me', authenticateToken, async (req: any, res) => {
  try {
    const user = await authService.getMe(req.user.id);
    res.json(user);
  } catch (error: any) {
    res.status(404).json({ error: 'User not found' });
  }
});

router.get('/facebook/url', async (req, res) => {
  const { token, origin, fbAppRecordId } = req.query as Record<string, string>;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const url = await authService.getFacebookOAuthUrl(decoded.id, token, origin || '', fbAppRecordId);
    res.json({ url });
  } catch (error: any) {
    if (error.requires_config) return res.status(400).json({ error: error.message, requires_config: true });
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  try {
    const result = await authService.requestPasswordReset(email);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required' });
  try {
    const result = await authService.resetPassword(token, newPassword);
    res.json(result);
  } catch (error: any) {
    if (error.message === 'INVALID_OR_EXPIRED_TOKEN') {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
