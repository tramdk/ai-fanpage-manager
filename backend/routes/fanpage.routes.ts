import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as fanpageService from '../services/fanpage.service.js';
import multer from 'multer';

const router = Router();
const upload = multer();

router.get('/', authenticateToken, async (req: any, res) => {
    try {
      const fanpages = await fanpageService.listFanpages(req.user.id);
      res.json(fanpages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.post('/refresh', authenticateToken, async (req: any, res) => {
    res.json({ success: true, message: 'Fanpage list refreshed' });
});

router.patch('/:id/token', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'Access Token is required' });
    try {
      await fanpageService.updateToken(req.user.id, id, accessToken);
      res.json({ message: 'Token updated successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', authenticateToken, async (req: any, res) => {
    try {
      await fanpageService.removeFanpage(req.user.id, req.params.id);
      res.json({ message: 'Fanpage connection removed' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.post('/post', authenticateToken, async (req: any, res) => {
    const { pageId, message, media } = req.body;
    
    try {
      const result = await fanpageService.postDirectly(req.user.id, pageId, message, media);
      res.json({ success: true, fbId: result.id || result.post_id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

export default router;
