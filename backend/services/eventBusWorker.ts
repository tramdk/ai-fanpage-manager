import Redis from 'ioredis';
import { prisma } from '../config/prisma.js';
import { decrypt } from '../utils/encryption.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const STREAM_NAME = 'reels_stream';
const GROUP_NAME = 'manager_workers';
const CONSUMER_NAME = `manager_${Math.random().toString(36).substring(7)}`;

/**
 * Listens to the Event Bus (Redis Stream) for reel generation updates.
 * Updates the local Post and VideoQueue status when video is ready.
 */
export async function startEventBusWorker() {
  console.log(`📡 [EVENT BUS] Manager Worker ${CONSUMER_NAME} starting...`);

  // Helper to create group
  const createGroup = async () => {
    try {
      await redis.xgroup('CREATE', STREAM_NAME, GROUP_NAME, '0', 'MKSTREAM');
      console.log(`📡 [EVENT BUS] Created consumer group: ${GROUP_NAME}`);
    } catch (err: any) {
      if (err.message.includes('BUSYGROUP')) {
        // Group already exists, this is fine
        return;
      }
      console.error('❌ [EVENT BUS] Error creating group:', err.message);
    }
  };

  // 1. Initial attempt to create Consumer Group
  await createGroup();

  // 2. Loop to read messages
  while (true) {
    try {
      const results = await redis.xreadgroup(
        'GROUP', GROUP_NAME, CONSUMER_NAME,
        'COUNT', '1',
        'BLOCK', '5000',
        'STREAMS', STREAM_NAME, '>'
      );

      if (!results || results.length === 0) continue;

      const [stream, messages] = results[0] as [string, any[]];
      for (const [messageId, [_, data]] of messages) {
        const eventData = JSON.parse(data as string);
        
        switch (eventData.event) {
          case 'REEL_PROCESSING':
            await handleProcessing(eventData.payload);
            break;
          case 'REEL_COMPLETED':
            await handleCompletion(eventData.payload);
            break;
          case 'REEL_FAILED':
            await handleFailure(eventData.payload);
            break;
        }

        // Acknowledge message
        await redis.xack(STREAM_NAME, GROUP_NAME, messageId);
      }
    } catch (err: any) {
      // If the group is missing (can happen if Redis was wiped or stream was deleted/recreated)
      if (err.message.includes('NOGROUP')) {
        console.warn(`⚠️ [EVENT BUS] Consumer group ${GROUP_NAME} missing. Re-creating...`);
        await createGroup();
      } else {
        console.error('❌ [EVENT BUS] Error in manager worker loop:', err);
      }
      
      // Wait before retrying to avoid spamming
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function handleProcessing(payload: any) {
  const { reelId } = payload;
  console.log(`⏳ [EVENT BUS] Reel ${reelId} is being processed...`);
  await prisma.videoQueue.updateMany({
    where: { videoId: reelId },
    data: { status: 'processing' }
  });
}

async function handleCompletion(payload: any) {
  const { reelId, videoUrl } = payload;
  console.log(`✅ [EVENT BUS] Reel ${reelId} COMPLETED. Video URL: ${videoUrl}`);

  try {
    // 1. Find the queue item to get the postId
    const queueItem = await prisma.videoQueue.findFirst({
      where: { videoId: reelId }
    });

    if (!queueItem) {
      console.warn(`[EVENT BUS] No queue item found for videoId: ${reelId}`);
      return;
    }

    // 2. Update the Post with the video URL
    const post = await prisma.post.update({
      where: { id: queueItem.postId },
      data: { imageUrl: videoUrl }
    });

    // 3. Remove from queue
    await prisma.videoQueue.delete({ where: { id: queueItem.id } });

    // 4. Reactive publishing check (if needed)
    await triggerImmediatePublishIfPassed(post);

  } catch (err: any) {
    console.error(`❌ [EVENT BUS] Error handling completion for ${reelId}:`, err.message);
  }
}

async function handleFailure(payload: any) {
  const { reelId, error } = payload;
  console.log(`❌ [EVENT BUS] Reel ${reelId} FAILED: ${error}`);

  await prisma.videoQueue.updateMany({
    where: { videoId: reelId },
    data: { status: 'error' }
  });
}

/**
 * If the scheduled time for this post has already passed, publish it immediately now that the video is ready.
 */
async function triggerImmediatePublishIfPassed(post: any) {
  if (!post.scheduleId) return;

  const schedule = await prisma.schedule.findUnique({
    where: { id: post.scheduleId },
    include: { fanpage: true }
  });

  if (!schedule || schedule.status !== 'active') return;

  const [sHour, sMin] = schedule.time.split(':').map(Number);
  const now = new Date();
  const scheduledToday = new Date();
  scheduledToday.setHours(sHour, sMin, 0, 0);

  if (now > scheduledToday) {
    // Check if this is the first queued post to maintain order
    const firstPost = await prisma.post.findFirst({
      where: { scheduleId: schedule.id, status: 'queued' },
      orderBy: { orderIndex: 'asc' }
    });

    if (firstPost && firstPost.id === post.id) {
      console.log(`🚀 [EVENT BUS] Scheduled time ${schedule.time} has passed. Publishing post ${post.id} IMMEDIATELY.`);
      
      const fanpage = await prisma.fanpage.findUnique({
        where: { pageId: schedule.fanpageId },
        include: { user: true }
      });

      if (fanpage && fanpage.accessToken && fanpage.user) {
        const { postToFacebook } = await import('./facebook.service.js');
        const decryptedToken = decrypt(fanpage.accessToken, fanpage.user.email);
        await postToFacebook(post, fanpage, decryptedToken);
        
        await prisma.post.update({
          where: { id: post.id },
          data: { status: 'published' }
        });
      }
    }
  }
}
