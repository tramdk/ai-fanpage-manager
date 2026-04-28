import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const period = (req.query.period as string) || 'week'; // 'week' or 'month'
      const days = period === 'month' ? 30 : 7;
      
      const [totalFanpages, totalPosts, scheduledPosts, recentPosts, postHistory] = await Promise.all([
        prisma.fanpage.count({ where: { userId } }),
        prisma.post.count({ where: { userId, status: 'published' } }),
        prisma.post.count({ where: { userId, status: 'queued' } }),
        prisma.post.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { fanpage: { select: { name: true } } }
        }),
        prisma.post.findMany({
          where: { 
            userId,
            createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
          },
          select: { createdAt: true }
        })
      ]);

      // Calculate trends
      const trends = new Array(days).fill(0);
      const now = new Date();
      now.setHours(23, 59, 59, 999); // End of today

      postHistory.forEach(p => {
        const diffTime = now.getTime() - p.createdAt.getTime();
        const diffDays = Math.floor(diffTime / (24 * 60 * 60 * 1000));
        if (diffDays >= 0 && diffDays < days) {
          trends[days - 1 - diffDays]++;
        }
      });

      res.json({
        stats: { 
          totalFanpages, 
          totalPosts, 
          scheduledPosts,
          growth: 12.5
        },
        trends,
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
