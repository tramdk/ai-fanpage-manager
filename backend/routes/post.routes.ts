import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { decrypt } from '../utils/encryption.js';
import { authenticateToken } from '../middleware/auth.js';
import { postToFacebook } from '../services/facebook.service.js';

const router = Router();

router.get('/posts', authenticateToken, async (req: any, res) => {
    try {
      const posts = await prisma.post.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        include: { fanpage: { select: { name: true } } }
      });
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.post('/posts/queue', authenticateToken, async (req: any, res) => {
    const { scheduleId, posts } = req.body;
    if (!scheduleId || !Array.isArray(posts)) return res.status(400).json({ error: 'Missing scheduleId or posts array' });

    try {
      const schedule = await prisma.schedule.findUnique({
        where: { id: scheduleId, userId: req.user.id }
      });
      if (!schedule) return res.status(404).json({ error: 'Schedule not found' });

      // Delete existing queued posts for this schedule
      await prisma.post.deleteMany({ where: { scheduleId, status: 'queued', userId: req.user.id } });

      const createdPosts = await prisma.post.createMany({
        data: posts.map((p: any, index: number) => ({
          scheduleId,
          userId: req.user.id,
          fanpageId: schedule.fanpageId,
          content: p.content,
          imageUrl: p.imageUrl,
          status: 'queued',
          topic: schedule.topic,
          orderIndex: index
        }))
      });

      res.json({ message: 'Queue updated successfully', count: createdPosts.count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.post('/facebook/post', authenticateToken, async (req: any, res) => {
    const { content, imageUrl, fanpageId } = req.body;
    if (!fanpageId) return res.status(400).json({ error: 'Fanpage ID is required' });

    try {
      const fanpage = await prisma.fanpage.findUnique({
        where: { pageId: fanpageId, userId: req.user.id },
        include: { user: true }
      });

      if (!fanpage || !fanpage.accessToken || !fanpage.user) return res.status(404).json({ error: 'Fanpage not found or user missing' });

      const decryptedToken = decrypt(fanpage.accessToken, fanpage.user.email);
      const postData = { content, imageUrl };
      
      const result = await postToFacebook(postData, fanpage, decryptedToken);

      await prisma.post.create({
        data: {
          userId: req.user.id,
          fanpageId,
          content: content || '',
          imageUrl,
          status: 'published',
          topic: 'Manual Post',
          fbPostId: result.id
        }
      });

      res.json({ success: true, postId: result.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

export default router;
