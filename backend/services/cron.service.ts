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
      // With Pub/Sub, the EventBusWorker updates imageUrl as soon as it's ready.
      // If imageUrl is still empty, it means rendering is in progress or failed.
      if (!queuedPost.imageUrl || (!queuedPost.imageUrl.includes('.mp4') && !queuedPost.imageUrl.includes('autoreels_videos'))) {
        console.log(`[CRON-CATCHUP] Video ${queuedPost.videoId} not ready yet (handled by Pub/Sub). Skipping...`);
        return;
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
        // Pub/Sub worker updates imageUrl when finished.
        // If not ready, we wait for the next cron cycle or for the EventBusWorker to trigger immediate publish.
        if (!queuedPost.imageUrl || (!queuedPost.imageUrl.includes('.mp4') && !queuedPost.imageUrl.includes('autoreels_videos'))) {
          console.log(`[CRON] Video ${queuedPost.videoId} is not ready yet. Waiting for Pub/Sub update...`);
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
    
    if (!Array.isArray(statuses)) {
      console.error('[CRON-SYNC] Statuses response is not an array:', statuses);
      return;
    }

    console.log(`[CRON-SYNC DEBUG] Received ${statuses.length} status updates from Autoreels.`);

    for (const videoInfo of statuses) {
      console.log(`[CRON-SYNC DEBUG] Checking item ID: ${videoInfo.id}, Status: ${videoInfo.status}`);
      
      // If video is finished (ready) or failed (not_found/error)
      if (videoInfo.status === 'ready' || videoInfo.status === 'completed' || videoInfo.videoUrl || videoInfo.status === 'not_found' || videoInfo.status === 'error') {
        const queueItem = queueItems.find(q => q.videoId === videoInfo.id);
        if (!queueItem) {
          console.warn(`[CRON-SYNC DEBUG] No local QueueItem found for videoId: ${videoInfo.id}`);
          continue;
        }

        const post = await prisma.post.findUnique({ where: { id: queueItem.postId } });
        if (!post) {
          console.warn(`[CRON-SYNC DEBUG] No local Post found for postId: ${queueItem.postId}`);
          await prisma.videoQueue.delete({ where: { id: queueItem.id } });
          continue;
        }

        if (videoInfo.status === 'ready' || videoInfo.status === 'completed' || videoInfo.videoUrl || videoInfo.data) {
          // Debug log to see the actual structure from Autoreels
          console.log(`[CRON-SYNC DEBUG] videoInfo for post ${post.id}:`, JSON.stringify(videoInfo, null, 2));

          // Aggressive extraction of the video URL
          const videoUrl = videoInfo.data || videoInfo.videoUrl || videoInfo.url || (videoInfo.video && (videoInfo.video.videoUrl || videoInfo.video.url));
          
          if (!videoUrl) {
            console.error(`[CRON-SYNC] Could not find video URL in Autoreels response for post ${post.id}`);
            continue;
          }

          console.log(`[CRON-SYNC] -> Updating post ${post.id} with raw video URL: ${videoUrl}`);

          await prisma.post.update({
            where: { id: post.id },
            data: { imageUrl: videoUrl }
          });
        } else if (videoInfo.status === 'error' || videoInfo.status === 'not_found') {
          console.log(`[CRON-SYNC] -> Video FAILED or NOT FOUND for post ${post.id}.`);
        } else {
          // Still processing, skip queue removal
          continue;
        }

        // Always remove from queue if it reached a terminal state
        await prisma.videoQueue.delete({ where: { id: queueItem.id } });

        // Optimization: If the video just became ready, check if we should publish it IMMEDIATELY
        // (e.g. if the scheduled time for today has already passed)
        if (videoInfo.status === 'ready' || videoInfo.status === 'completed' || videoInfo.videoUrl) {
          const schedule = await prisma.schedule.findUnique({ where: { id: post.scheduleId || '' } });
          if (schedule && schedule.status === 'active') {
            const [sHour, sMin] = schedule.time.split(':').map(Number);
            const now = new Date();
            const scheduledToday = new Date();
            scheduledToday.setHours(sHour, sMin, 0, 0);

            if (now > scheduledToday) {
              // Check if this is the FIRST queued post (to maintain order)
              const firstPost = await prisma.post.findFirst({
                where: { scheduleId: schedule.id, status: 'queued' },
                orderBy: { orderIndex: 'asc' }
              });

              if (firstPost && firstPost.id === post.id) {
                console.log(`[CRON-SYNC] Scheduled time ${schedule.time} has passed. Publishing post ${post.id} IMMEDIATELY.`);
                const fanpage = await prisma.fanpage.findUnique({ where: { pageId: schedule.fanpageId }, include: { user: true } });
                if (fanpage && fanpage.accessToken && fanpage.user) {
                  const { decrypt } = await import('../utils/encryption.js');
                  const { postToFacebook } = await import('./facebook.service.js');
                  const decryptedToken = decrypt(fanpage.accessToken, fanpage.user.email);
                  await postToFacebook(post, fanpage, decryptedToken);
                }
              }
            }
          }
        }
      }
    }


    // Fast-follow: if any items were processed, check again soon
    if (statuses.length > 0) {
      const anyFinished = statuses.some(v => v.status === 'ready' || v.status === 'completed' || v.videoUrl || v.status === 'not_found' || v.status === 'error');
      if (anyFinished) {
        setTimeout(() => {
          syncVideoStatuses().catch(() => { });
        }, 10000); // 10 seconds fast-follow
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
