import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as fbappService from '../services/fbapp.service.js';

const router = Router();

router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const apps = await fbappService.listApps(req.user.id);
    res.json(apps);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req: any, res) => {
  const { appId, appSecret, name } = req.body;
  if (!appId || !appSecret) return res.status(400).json({ error: 'App ID and Secret are required' });
  try {
    const result = await fbappService.createApp(req.user.id, appId, appSecret, name);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req: any, res) => {
  try {
    await fbappService.deleteApp(req.user.id, req.params.id);
    res.json({ message: 'App removed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
