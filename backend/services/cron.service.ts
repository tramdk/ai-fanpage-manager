import nodeCron from 'node-cron';
import { prisma } from '../config/prisma.js';
import { decrypt } from '../utils/encryption.js';
import { postToFacebook } from './facebook.service.js';

export const activeCronJobs = new Map<string, any>();

export function scheduleJob(schedule: any) {
  const [hour, minute] = schedule.time.split(':');
  const cronExpression = `${minute} ${hour} * * *`;

  const task = nodeCron.schedule(cronExpression, async () => {
    console.log(`[CRON] Executing scheduled post for topic: ${schedule.topic}`);
    try {
      const fanpage = await prisma.fanpage.findUnique({
        where: { pageId: schedule.fanpageId },
        include: { user: true }
      });
      if (!fanpage || !fanpage.accessToken || !fanpage.user) {
        console.error(`[CRON] Fanpage not found or missing access token for schedule ${schedule.id}`);
        return;
      }

      const decryptedToken = decrypt(fanpage.accessToken, fanpage.user.email);

      const queuedPost = await prisma.post.findFirst({
        where: {
          scheduleId: schedule.id,
          status: 'queued',
          fanpageId: schedule.fanpageId,
          userId: schedule.userId
        },
        orderBy: { orderIndex: 'asc' }
      });

      if (!queuedPost) {
        console.log(`[CRON] No queued posts found for topic ${schedule.topic}.`);
        return;
      }

      const fbData = await postToFacebook(queuedPost, fanpage, decryptedToken);

      await prisma.post.update({
        where: { id: queuedPost.id },
        data: { status: 'published', error: null }
      });

      console.log(`[CRON] Successfully posted scheduled content for topic: ${schedule.topic}, Post ID: ${fbData.id}`);

      const remainingPosts = await prisma.post.count({
        where: { scheduleId: schedule.id, status: 'queued' },
      });

      if (remainingPosts === 0) {
        await prisma.schedule.update({
          where: { id: schedule.id },
          data: { status: 'suspended' }
        });
        
        const job = activeCronJobs.get(schedule.id);
        if (job) {
          job.stop();
          activeCronJobs.delete(schedule.id);
        }
        console.log(`[CRON] Schedule ${schedule.id} exhausted its queued posts.`);
      }
    } catch (error: any) {
      console.error(`[CRON] Failed to execute scheduled post for topic ${schedule.topic}:`, error);
      try {
        const queuedPost = await prisma.post.findFirst({
          where: { scheduleId: schedule.id, status: 'queued', fanpageId: schedule.fanpageId },
          orderBy: { orderIndex: 'asc' }
        });
        if (queuedPost) {
          await prisma.post.update({
            where: { id: queuedPost.id },
            data: { status: 'failed', error: error.message || 'Unknown error' }
          });
        }
      } catch (e) {
        console.error('Failed to update post status to failed:', e);
      }
    }
  });

  activeCronJobs.set(schedule.id, task);
}

export async function stopAllJobs() {
  for (const [id, job] of activeCronJobs.entries()) {
    job.stop();
  }
  activeCronJobs.clear();
}
