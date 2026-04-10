import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// FACEBOOK APP MANAGEMENT
router.get('/apps', authenticateToken, async (req: any, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      let apps = await prisma.facebookApp.findMany({ where: { userId: req.user.id } });

      const hasLegacy = user.facebookAppId && user.facebookAppId.length > 5;
      if (apps.length === 0 && hasLegacy) {
        try {
          const migratedApp = await prisma.facebookApp.create({
            data: { appId: user.facebookAppId, appSecret: user.facebookAppSecret || '', name: 'Primary App (Legacy)', userId: user.id }
          });
          apps = [migratedApp];
        } catch (e) {
          console.error('[AUTH] Failed to migrate legacy app:', e);
        }
      }
      res.json(apps.map(app => ({ id: app.id, appId: decrypt(app.appId, user.email), name: app.name || 'Unnamed App', createdAt: app.createdAt })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.post('/apps', authenticateToken, async (req: any, res) => {
    const { appId, appSecret, name } = req.body;
    if (!appId || !appSecret) return res.status(400).json({ error: 'App ID and Secret are required' });
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      const newApp = await prisma.facebookApp.create({
        data: { appId: encrypt(appId, user.email), appSecret: encrypt(appSecret, user.email), name: name || 'New App', userId: user.id }
      });
      res.json({ id: newApp.id, message: 'App added' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.delete('/apps/:id', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    try {
      await prisma.facebookApp.delete({ where: { id, userId: req.user.id } });
      res.json({ message: 'App removed' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

// FANPAGE MANAGEMENT
router.get('/fanpages', authenticateToken, async (req: any, res) => {
    try {
      const fanpages = await prisma.fanpage.findMany({ where: { userId: req.user.id } });
      res.json(fanpages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.delete('/fanpages/:id', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    try {
      await prisma.fanpage.delete({ where: { id, userId: req.user.id } });
      res.json({ message: 'Fanpage connection removed' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

export default router;
