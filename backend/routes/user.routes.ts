import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/facebook-config', authenticateToken, async (req: any, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      res.json({
        facebookAppId: user.facebookAppId ? decrypt(user.facebookAppId, user.email) : '',
        hasSecret: !!user.facebookAppSecret
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.put('/profile', authenticateToken, async (req: any, res) => {
    const { name } = req.body;
    try {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { name }
      });
      res.json({ message: 'Profile updated' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.put('/password', authenticateToken, async (req: any, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) return res.status(400).json({ error: 'Current password incorrect' });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: req.user.id },
        data: { password: hashedPassword, requirePasswordChange: false }
      });
      res.json({ message: 'Password updated' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.put('/facebook-config', authenticateToken, async (req: any, res) => {
    const { facebookAppId, facebookAppSecret } = req.body;
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const dataToUpdate: any = {
        facebookAppId: facebookAppId ? encrypt(facebookAppId, user.email) : null
      };
      if (facebookAppSecret) dataToUpdate.facebookAppSecret = encrypt(facebookAppSecret, user.email);

      await prisma.user.update({
        where: { id: req.user.id },
        data: dataToUpdate
      });

      if (facebookAppId && facebookAppSecret) {
        await prisma.facebookApp.upsert({
          where: { id: 'legacy-root' },
          update: { appId: encrypt(facebookAppId, user.email), appSecret: encrypt(facebookAppSecret, user.email), name: 'Primary App' },
          create: { id: 'legacy-root', appId: encrypt(facebookAppId, user.email), appSecret: encrypt(facebookAppSecret, user.email), name: 'Primary App', userId: user.id }
        });
      }
      res.json({ message: 'Facebook config saved' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

export default router;
