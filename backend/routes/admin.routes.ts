import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/users', authenticateToken, authenticateAdmin, async (req: any, res) => {
    try {
      const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.put('/users/:id/status', authenticateToken, authenticateAdmin, async (req: any, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { isActive }
      });
      res.json({ success: true, user: { id: user.id, isActive: user.isActive } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.post('/users/:id/reset-password', authenticateToken, authenticateAdmin, async (req: any, res) => {
    const { id } = req.params;
    const tempPassword = 'password@123';
    try {
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      await prisma.user.update({
        where: { id },
        data: { password: hashedPassword, requirePasswordChange: true }
      });
      res.json({ success: true, message: `Password reset to: ${tempPassword}` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

export default router;
