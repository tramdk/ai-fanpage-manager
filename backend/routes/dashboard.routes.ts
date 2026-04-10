import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const totalFanpages = await prisma.fanpage.count({ where: { userId } });
      const totalPosts = await prisma.post.count({ where: { userId, status: 'published' } });
      const scheduledPosts = await prisma.post.count({ where: { userId, status: 'queued' } });

      const recentPosts = await prisma.post.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { fanpage: { select: { name: true } } }
      });

      res.json({
        stats: { totalFanpages, totalPosts, scheduledPosts },
        recentPosts: recentPosts.map((post: any) => ({
          id: post.id,
          content: post.content,
          topic: post.topic,
          status: post.status,
          createdAt: post.createdAt,
          fanpageName: post.fanpage?.name || 'Unknown Page'
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

export default router;
