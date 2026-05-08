import { prisma } from '../config/prisma.js';
import { EventBusClient } from './EventBusClient.js';
import crypto from 'crypto';

const eb = new EventBusClient();

/**
 * Service to integrate with AutoReels API
 * Based on c:\Users\T\.gemini\antigravity\scratch\autoreels\API_GUIDE.md
 */

const AUTOREELS_URL = (process.env.AUTOREELS_URL || 'http://localhost:3003').replace(/\/$/, '');
const AUTOREELS_TOKEN = process.env.AUTOREELS_TOKEN || 'autoreels-default-token';

/**
 * Helper to remove emojis and special characters that might break TTS or look weird in captions
 */
function sanitizeText(text: string): string {
  const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
  let clean = text.replace(emojiRegex, '');

  // Remove hashtags (words starting with #)
  clean = clean.replace(/#\w+/g, '');

  // Remove markdown and special characters
  clean = clean.replace(/[*_~`|>\\\[\]]/g, ' ');
  return clean.replace(/\s+/g, ' ').trim();
}

export async function getAutoReelsOptions() {
  try {
    const headers = { 'X-API-Key': AUTOREELS_TOKEN };

    // Fetch voices, providers, bgm, and all settings in parallel
    const [voicesRes, providersRes, bgmRes, settingsRes] = await Promise.all([
      fetch(`${AUTOREELS_URL}/api/voices`, { headers, cache: 'no-store' }),
      fetch(`${AUTOREELS_URL}/api/voices/providers`, { headers, cache: 'no-store' }),
      fetch(`${AUTOREELS_URL}/api/videos/bgm-presets`, { headers, cache: 'no-store' }),
      fetch(`${AUTOREELS_URL}/api/settings`, { headers, cache: 'no-store' })
    ]);

    // Log failures for debugging
    if (!voicesRes.ok) console.warn(`[AUTOREELS] Failed to fetch voices: ${voicesRes.status} ${voicesRes.statusText}`);
    if (!providersRes.ok) console.warn(`[AUTOREELS] Failed to fetch providers: ${providersRes.status} ${providersRes.statusText}`);
    if (!bgmRes.ok) console.warn(`[AUTOREELS] Failed to fetch BGM: ${bgmRes.status} ${bgmRes.statusText}`);
    if (!settingsRes.ok) console.warn(`[AUTOREELS] Failed to fetch settings: ${settingsRes.status} ${settingsRes.statusText}`);

    // Validate responses before parsing JSON
    const results = await Promise.all([
      voicesRes.ok ? voicesRes.json() : Promise.resolve([]),
      providersRes.ok ? providersRes.json() : Promise.resolve([]),
      bgmRes.ok ? bgmRes.json() : Promise.resolve([]),
      settingsRes.ok ? settingsRes.json() : Promise.resolve({})
    ]);

    const [voices, providers, bgm, settings] = results;

    // Extract templates from settings (keys starting with video_template_)
    const templates = Object.keys(settings)
      .filter(key => key.startsWith('video_template_'))
      .map(key => ({
        id: key.replace('video_template_', ''),
        name: key.replace('video_template_', '').charAt(0).toUpperCase() + key.replace('video_template_', '').slice(1)
      }));

    // If no specific templates found, use defaults
    if (templates.length === 0) {
      templates.push(
        { id: 'modern', name: 'Modern' },
        { id: 'bold', name: 'Bold' },
        { id: 'classic', name: 'Classic' },
        { id: 'cinematic', name: 'Cinematic' }
      );
    }

    return { voices, providers, bgm, templates };
  } catch (err) {
    console.error('[AUTOREELS] Failed to fetch options:', err);
    return { voices: [], bgm: [], templates: [] };
  }
}

export async function generateVideoFromPost(postId: string, options: {
  templateId?: string,
  ttsProvider?: string,
  ttsVoiceId?: string,
  bgmAssetId?: string
} = {}) {
  console.log(`[AUTOREELS] Generating video for post: ${postId}`);

  const post = await prisma.post.findUnique({
    where: { id: postId }
  });

  if (!post) throw new Error('Post not found');

  // Optimization: Check if post already has a video tracked by ID or URL
  if (post.videoId) {
    console.log(`[AUTOREELS] Post ${postId} has videoId: ${post.videoId}. Fetching latest status...`);
    try {
      const status = await getVideoStatus(post.videoId);
      if (status && (status.status === 'ready' || status.status === 'completed' || status.videoUrl)) {
        console.log(`[AUTOREELS] Existing video is READY. Returning early.`);
        return { success: true, videoUrl: status.videoUrl, alreadyExists: true, videoId: post.videoId };
      }
    } catch (e) {
      console.warn(`[AUTOREELS] Failed to fetch status for existing videoId ${post.videoId}, falling back to URL check.`);
    }
  }

  let existingVideoUrl = '';
  if (post.imageUrl) {
    if (post.imageUrl.startsWith('[') || post.imageUrl.startsWith('{')) {
      try {
        const parsed = JSON.parse(post.imageUrl);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        const video = items.find(i => {
          const val = (i.data || i.url || '').toLowerCase();
          return val.includes('/video/') || val.includes('autoreels_videos') || val.endsWith('.mp4');
        });
        if (video) existingVideoUrl = video.data || video.url;
      } catch (e) { }
    } else if (post.imageUrl.includes('/video/') || post.imageUrl.endsWith('.mp4')) {
      existingVideoUrl = post.imageUrl;
    }
  }

  if (existingVideoUrl) {
    console.log(`[AUTOREELS] Post ${postId} already has a video URL: ${existingVideoUrl}`);
    return { success: true, videoUrl: existingVideoUrl, alreadyExists: true };
  }

  console.log(`[AUTOREELS] Proceeding with NEW video generation for post ${postId}...`);

  const title = `Video cho bài viết: ${post.id.substring(0, 8)}`;

  // 1. Extract all available images from the post media list
  let allImages: string[] = [];
  if (post.imageUrl) {
    try {
      const parsed = JSON.parse(post.imageUrl);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      allImages = items
        .filter(i => (i.type === 'image' || !(i.data || i.url || '').includes('/video/')))
        .map(i => i.data || i.url)
        .filter(url => !!url);
    } catch (e) {
      // If not JSON, check if it's a single raw image URL
      if (!post.imageUrl.includes('/video/') && !post.imageUrl.startsWith('[')) {
        allImages = [post.imageUrl];
      }
    }
  }

  // 2. Sanitize content and split into scenes
  const cleanContent = sanitizeText(post.content || '');
  const topic = post.topic || 'lifestyle';
  const lines = cleanContent
    .split(/\. |\n/)
    .map(line => line.trim())
    .filter(line => line.length > 5);

  const scenes = lines.map((line, idx) => ({
    id: idx + 1,
    type: idx === 0 ? 'hook' : (idx === lines.length - 1 ? 'outro' : 'body'),
    voiceText: line,
    imageKeyword: topic,
    imageUrl: allImages.length > 0 ? allImages[idx % allImages.length] : ''
  }));

  console.log(`[AUTOREELS-DEBUG] Generating video for post ${postId}`);
  console.log(`[AUTOREELS-DEBUG] Scenes generated: ${scenes.length}`);

  const payload = {
    title,
    script: {
      scenes,
      suggestedImages: allImages.length > 0 ? allImages.slice(0, 5) : []
    }
  };
  const payloadStr = JSON.stringify(payload);
  console.log(`[AUTOREELS] Payload ready. Scenes: ${scenes.length}, Images: ${allImages.length}`);

  const videoId = crypto.randomUUID();

  // 3. Publish to Event Bus
  await eb.publish('REEL_REQUESTED', {
    reelId: videoId,
    articleId: postId,
    title,
    templateId: options.templateId || 'classic',
    content: cleanContent,
    script: JSON.stringify({ 
      scenes,
      suggestedImages: allImages.length > 0 ? allImages.slice(0, 5) : []
    }),
    imageUrl: allImages[0] || null,
    ttsProvider: options.ttsProvider || 'edge',
    ttsVoiceId: options.ttsVoiceId || 'vi-VN-HoaiMyNeural',
    bgmAssetId: options.bgmAssetId || 'none',
    bgmVolume: 0.15,
    source: 'manager'
  });

  // Persist the videoId to the local database immediately
  await prisma.post.update({
    where: { id: postId },
    data: { videoId: videoId }
  });

  // Track in the dedicated high-performance queue
  await prisma.videoQueue.upsert({
    where: { postId: postId },
    update: { videoId: videoId, status: 'processing' },
    create: { postId: postId, videoId: videoId, status: 'processing' }
  }).catch(err => console.error('[AUTOREELS] Failed to add to VideoQueue:', err));

  return { success: true, videoId: videoId };
}
export async function getVideoStatus(videoId: string) {
  if (!videoId || videoId === 'undefined' || videoId === 'existing' || videoId === 'null') {
    return { status: 'error', error: 'Invalid Video ID' };
  }

  try {
    const res = await fetch(`${AUTOREELS_URL}/api/videos/${videoId}`, {
      headers: { 'X-API-Key': AUTOREELS_TOKEN }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch video status');

    // AutoReels typically returns { id, status, videoUrl, ... }
    return data;
  } catch (err) {
    console.error('[AUTOREELS] Status Check Error:', err);
    throw err;
  }
}
export async function getVideoStatusBatch(videoIds: string[]) {
  if (!videoIds || videoIds.length === 0) return [];

  try {
    console.log(`[AUTOREELS] Polling status for ${videoIds.length} IDs from ${AUTOREELS_URL}`);
    const res = await fetch(`${AUTOREELS_URL}/api/videos/bulk-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AUTOREELS_TOKEN
      },
      body: JSON.stringify({ ids: videoIds })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[AUTOREELS] Bulk status API error:', data);
      return [];
    }

    // Defensive mapping: Ensure every item has an 'id' field (some endpoints might use videoId)
    const normalizedData = Array.isArray(data) ? data.map(item => ({
      ...item,
      id: item.id || item.videoId
    })) : [];

    console.log(`[AUTOREELS] Received ${normalizedData.length} statuses. Sample:`, JSON.stringify(normalizedData[0], null, 2));
    return normalizedData;
  } catch (err) {
    console.error('[AUTOREELS] Status Batch Network Error:', err);
    return [];
  }
}

/**
 * Sends a batch of video generation requests to AutoReels
 */
export async function generateVideoBatch(items: { postId: string, options: any }[]) {
  if (items.length === 0) return [];

  try {
    // 1. Prepare data for AutoReels
    const batchData = await Promise.all(items.map(async (item) => {
      const post = await prisma.post.findUnique({ where: { id: item.postId } });
      if (!post) throw new Error(`Post ${item.postId} not found`);

      let imageUrl = null;
      if (post.imageUrl) {
        try {
          if (post.imageUrl.startsWith('[') || post.imageUrl.startsWith('{')) {
            const media = JSON.parse(post.imageUrl);
            const items = Array.isArray(media) ? media : [media];
            imageUrl = items[0]?.data || items[0]?.url || post.imageUrl;
          } else {
            imageUrl = post.imageUrl;
          }
        } catch (e) {
          imageUrl = post.imageUrl;
        }
      }

      return {
        articleId: post.id,
        templateId: item.options.templateId,
        content: post.content,
        imageUrl: imageUrl,
        ttsProvider: item.options.ttsProvider,
        ttsVoiceId: item.options.ttsVoiceId,
        bgmAssetId: item.options.bgmAssetId,
        source: 'manager'
      };
    }));

    // 2. Send each item to Event Bus
    const results = [];
    for (const data of batchData) {
      const videoId = crypto.randomUUID();
      
      await eb.publish('REEL_REQUESTED', {
        reelId: videoId,
        articleId: data.articleId,
        title: data.content?.substring(0, 50) || 'Batch Video',
        templateId: data.templateId || 'classic',
        content: data.content,
        imageUrl: data.imageUrl,
        ttsProvider: data.ttsProvider,
        ttsVoiceId: data.ttsVoiceId,
        bgmAssetId: data.bgmAssetId,
        source: 'manager'
      });

      // Update local DB
      await Promise.all([
        prisma.post.update({
          where: { id: data.articleId },
          data: { videoId: videoId }
        }),
        prisma.videoQueue.upsert({
          where: { postId: data.articleId },
          update: { videoId: videoId, status: 'processing' },
          create: { postId: data.articleId, videoId: videoId, status: 'processing' }
        })
      ]);

      results.push({ videoId, status: 'pending' });
    }

    return results;
  } catch (error) {
    console.error('[AUTOREELS BATCH ERROR]', error);
    throw error;
  }
}
