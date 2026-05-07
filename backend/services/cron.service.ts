import nodeCron from 'node-cron';
import { prisma } from '../config/prisma.js';
import { decrypt } from '../utils/encryption.js';
import { postToFacebook } from './facebook.service.js';

export const activeCronJobs = new Map<string, any>();

/**
 * Checks for schedules that should have run today but were missed (e.g. server down)
 */
export async function processMissedSchedules() {
  console.log('[CRON] Checking for missed schedules...');
  const now = new Date();
  const currentHHmm = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const todayStart = new Date(now.setHours(0, 0, 0, 0));

  try {
    const activeSchedules = await prisma.schedule.findMany({
      where: { status: 'active' },
      include: { fanpage: true }
    });

    for (const schedule of activeSchedules) {
      // If the scheduled time has already passed today
      if (schedule.time < currentHHmm) {
        // Check if any post was ALREADY published today for this schedule
        // Note: Since we don't have publishedAt, we use createdAt of published posts as a proxy 
        // OR we just check if there's any published post for this schedule today.
        // Actually, a better way is to check the latest published post for this schedule.
        const publishedToday = await prisma.post.findFirst({
          where: {
            scheduleId: schedule.id,
            status: 'published',
            createdAt: { gte: todayStart }
          }
        });

        if (!publishedToday) {
          console.log(`[CRON-CATCHUP] Schedule ${schedule.id} (${schedule.topic}) missed its ${schedule.time} slot. Publishing now...`);
          // This will run the logic immediately for this schedule
          await executeImmediate(schedule);
        }
      }
    }
  } catch (err) {
    console.error('[CRON-CATCHUP] Error checking missed schedules:', err);
  }
}

async function executeImmediate(schedule: any) {
  // Logic extracted from scheduleJob to run once
  try {
    const fanpage = await prisma.fanpage.findUnique({
      where: { pageId: schedule.fanpageId },
      include: { user: true }
    });
    if (!fanpage || !fanpage.accessToken || !fanpage.user) return;

    const decryptedToken = decrypt(fanpage.accessToken, fanpage.user.email);
    const autoreelsService = await import('./autoreels.service.js');

    const queuedPost = await prisma.post.findFirst({
      where: { scheduleId: schedule.id, status: 'queued' },
      orderBy: { orderIndex: 'asc' }
    });

    if (!queuedPost) return;

    // Handle video render check
    if (queuedPost.videoId) {
      const videoStatus = await autoreelsService.getVideoStatus(queuedPost.videoId);
      if (videoStatus.status !== 'ready' && videoStatus.status !== 'completed' && !videoStatus.videoUrl) {
         console.log(`[CRON-CATCHUP] Video not ready for catchup, skipping. Regular cron will pick it up or retry.`);
         return; 
      }
      if (videoStatus.videoUrl) {
        queuedPost.imageUrl = JSON.stringify([{ type: 'video', data: videoStatus.videoUrl, id: 'v1' }]);
      }
    }

    await postToFacebook(queuedPost, fanpage, decryptedToken);
    await prisma.post.update({
      where: { id: queuedPost.id },
      data: { status: 'published' }
    });
    console.log(`[CRON-CATCHUP] Successfully caught up for topic: ${schedule.topic}`);

    // Check for exhaustion
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
      console.log(`[CRON-CATCHUP] Schedule ${schedule.id} exhausted its queued posts after catchup.`);
    }
  } catch (err) {
    console.error(`[CRON-CATCHUP] Failed catchup for ${schedule.topic}:`, err);
  }
}

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
      const autoreelsService = await import('./autoreels.service.js');

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

      // Handle Video Rendering Status
      if (queuedPost.videoId) {
        try {
          const videoStatus = await autoreelsService.getVideoStatus(queuedPost.videoId);
          
          if (videoStatus.status !== 'ready' && videoStatus.status !== 'completed' && !videoStatus.videoUrl) {
            console.log(`[CRON] Video ${queuedPost.videoId} is still ${videoStatus.status || 'rendering'}. Rescheduling in 15 minutes...`);
            
            // Reschedule for 15 minutes later
            const retryDate = new Date();
            retryDate.setMinutes(retryDate.getMinutes() + 15);
            const retryTime = `${retryDate.getHours().toString().padStart(2, '0')}:${retryDate.getMinutes().toString().padStart(2, '0')}`;
            
            // Create a temporary one-off schedule or just wait for next cycle?
            // Since this is a daily cron, we should probably set a timeout for this specific execution.
            setTimeout(() => {
               console.log(`[CRON-RETRY] Retrying post ${queuedPost.id} after delay...`);
               scheduleJob({ ...schedule, time: retryTime }); // This is a bit hacky but works for retrying
            }, 15 * 60 * 1000);

            return;
          }

          // Video is ready, ensure we have the URL
          if (videoStatus.videoUrl) {
            queuedPost.imageUrl = JSON.stringify([{ type: 'video', data: videoStatus.videoUrl, id: 'v1' }]);
          }
        } catch (vErr) {
          console.error(`[CRON] Video status check failed for ${queuedPost.videoId}:`, vErr);
          // If status check fails, we might want to wait as well
          return;
        }
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

/**
 * Background worker to sync statuses of all pending videos using a dedicated queue
 */
export async function syncVideoStatuses() {
  console.log('[CRON-SYNC] Checking VideoQueue for pending renders...');
  try {
    // 0. Auto-cleanup for stuck videos (stale for > 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const staleItems = await prisma.videoQueue.deleteMany({
      where: { createdAt: { lt: twoHoursAgo } }
    });
    if (staleItems.count > 0) {
      console.log(`[CRON-SYNC] Cleaned up ${staleItems.count} stale video queue items.`);
    }

    // 1. Query the dedicated high-performance queue
    const queueItems = await prisma.videoQueue.findMany({
      where: { status: 'processing' }
    });

    if (queueItems.length === 0) {
      console.log('[CRON-SYNC] VideoQueue is empty.');
      return;
    }

    const videoIds = queueItems.map(q => q.videoId);
    console.log(`[CRON-SYNC] Batch polling status for ${videoIds.length} queue items...`);
    
    const autoreelsService = await import('./autoreels.service.js');
    const statuses = await autoreelsService.getVideoStatusBatch(videoIds);

    for (const videoInfo of statuses) {
      // If video is finished (ready) or failed (not_found/error)
      if (videoInfo.status === 'ready' || videoInfo.status === 'completed' || videoInfo.videoUrl || videoInfo.status === 'not_found' || videoInfo.status === 'error') {
        const queueItem = queueItems.find(q => q.videoId === videoInfo.id);
        if (!queueItem) continue;

        const post = await prisma.post.findUnique({ where: { id: queueItem.postId } });
        if (!post) {
           await prisma.videoQueue.delete({ where: { id: queueItem.id } });
           continue;
        }

        if (videoInfo.status === 'ready' || videoInfo.status === 'completed' || videoInfo.videoUrl) {
          console.log(`[CRON-SYNC] -> Video READY for post ${post.id}. Updating post and clearing queue...`);
          
          let mediaItems = [];
          try {
            mediaItems = JSON.parse(post.imageUrl || '[]');
            if (!Array.isArray(mediaItems)) mediaItems = [];
          } catch (e) {
            if (post.imageUrl) mediaItems = [{ type: 'image', data: post.imageUrl, id: 'base' }];
          }

          const videoUrl = videoInfo.videoUrl || videoInfo.url;
          const updatedMedia = [...mediaItems, { type: 'video', data: videoUrl, id: `v_${Date.now()}`, isAiGenerated: true }];

          await prisma.post.update({
            where: { id: post.id },
            data: { imageUrl: JSON.stringify(updatedMedia) }
          });
        } else {
          console.log(`[CRON-SYNC] -> Video FAILED or NOT FOUND for post ${post.id}. Removing from queue.`);
        }

        // Always remove from queue if it reached a terminal state
        await prisma.videoQueue.delete({ where: { id: queueItem.id } });
      }
    }
  } catch (err) {
    console.error('[CRON-SYNC] Error in video sync worker:', err);
  }
}

export async function stopAllJobs() {
  for (const [id, job] of activeCronJobs.entries()) {
    job.stop();
  }
  activeCronJobs.clear();
}
