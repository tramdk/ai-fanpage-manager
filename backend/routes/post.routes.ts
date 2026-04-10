import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as postService from '../services/post.service.js';

const router = Router();

router.get('/', authenticateToken, async (req: any, res) => {
    try {
      const posts = await postService.getPostHistory(req.user.id);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.delete('/schedule/:scheduleId/queue', authenticateToken, async (req: any, res) => {
    try {
      const result = await postService.clearScheduleQueue(req.user.id, req.params.scheduleId);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.put('/:id', authenticateToken, async (req: any, res) => {
    try {
      const post = await postService.updatePost(req.user.id, req.params.id, req.body);
      res.json({ success: true, post });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.post('/queue', authenticateToken, async (req: any, res) => {
    try {
      const post = await postService.queuePost(req.user.id, req.body);
      res.json({ success: true, post });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.post('/reorder', authenticateToken, async (req: any, res) => {
    try {
      await postService.reorderPosts(req.user.id, req.body.postIds);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

export default router;
