import { prisma } from '../config/prisma.js';

export class DashboardService {
  /**
   * Get project-wide statistics and trends
   */
  async getOverview(userId: string, period: 'week' | 'month' = 'week') {
    const now = new Date();
    let startDate: Date;

    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay()); // Sunday
      startDate.setHours(0, 0, 0, 0);
    }
    
    // For growth comparison, we might need more history, but let's at least fix the trend display first
    const days = period === 'month' ? 30 : 7;

    const [
      totalFanpages,
      totalPosts,
      scheduledPosts,
      errorPosts,
      totalSchedules,
      totalVideos,
      recentPosts,
      postHistory
    ] = await Promise.all([
      // 1. Total connected fanpages
      prisma.fanpage.count({ where: { userId } }),
      
      // 2. Total successful posts
      prisma.post.count({ where: { userId, status: 'published' } }),
      
      // 3. Current queued operations
      prisma.post.count({ where: { userId, status: 'queued' } }),
      
      // 4. Failed operations
      prisma.post.count({ where: { userId, status: 'error' } }),
      
      // 5. Active schedules (AI Factories)
      prisma.schedule.count({ where: { userId, status: 'active' } }),
      
      // 6. Total Video projects tracked
      prisma.post.count({ 
        where: { 
          userId, 
          videoId: { not: null } 
        } 
      }),
      
      // 7. Recent activity feed
      prisma.post.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { fanpage: { select: { name: true } } }
      }),
      
      // 8. History for growth trends
      prisma.post.findMany({
        where: { 
          userId,
          createdAt: { gte: startDate }
        },
        select: { createdAt: true, status: true }
      })
    ]);

    // --- CALCULATE TRENDS ---
    let trends: { label: string, created: number, published: number }[] = [];

    if (period === 'week') {
      // Weekly view: Sunday to Saturday
      const sunday = new Date(now);
      sunday.setDate(now.getDate() - now.getDay()); // Go back to Sunday
      sunday.setHours(0, 0, 0, 0);

      const daysLabels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      trends = daysLabels.map((label, i) => {
        const d = new Date(sunday);
        d.setDate(sunday.getDate() + i);
        const dayPosts = postHistory.filter(p => 
          p.createdAt >= d && p.createdAt < new Date(d.getTime() + 24 * 60 * 60 * 1000)
        );
        return {
          label,
          created: dayPosts.length,
          published: dayPosts.filter(p => p.status === 'published').length
        };
      });
    } else {
      // Monthly view: Group by Week of the current month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Calculate weeks in month
      const weeks: { start: Date, end: Date }[] = [];
      let currentStart = new Date(startOfMonth);
      while (currentStart <= endOfMonth) {
        const currentEnd = new Date(currentStart);
        currentEnd.setDate(currentStart.getDate() + (6 - currentStart.getDay())); // To Saturday
        if (currentEnd > endOfMonth) currentEnd.setTime(endOfMonth.getTime());
        
        weeks.push({ start: new Date(currentStart), end: new Date(currentEnd.getTime() + 24 * 60 * 60 * 1000 - 1) });
        currentStart.setDate(currentEnd.getDate() + 1);
      }

      trends = weeks.map((w, i) => {
        const weekPosts = postHistory.filter(p => p.createdAt >= w.start && p.createdAt <= w.end);
        return {
          label: `Week ${i + 1}`,
          created: weekPosts.length,
          published: weekPosts.filter(p => p.status === 'published').length
        };
      });
    }

    // Calculate growth percentage (compare current period with previous period)
    const prevStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);
    const prevPostsCount = await prisma.post.count({
      where: {
        userId,
        status: 'published',
        createdAt: {
          gte: prevStartDate,
          lt: startDate
        }
      }
    });

    const currentPostsCount = postHistory.filter(p => p.status === 'published').length;
    let growth = 0;
    if (prevPostsCount > 0) {
      growth = Number(((currentPostsCount - prevPostsCount) / prevPostsCount * 100).toFixed(1));
    } else if (currentPostsCount > 0) {
      growth = 100;
    }

    return {
      stats: {
        totalFanpages,
        totalPosts,
        scheduledPosts,
        errorPosts,
        totalSchedules,
        totalVideos,
        growth
      },
      trends,
      recentPosts: recentPosts.map(post => ({
        id: post.id,
        topic: post.topic,
        content: post.content,
        status: post.status,
        createdAt: post.createdAt,
        fanpageName: post.fanpage?.name || 'Local Draft',
        hasVideo: !!post.videoId
      }))
    };
  }
}

export const dashboardService = new DashboardService();
