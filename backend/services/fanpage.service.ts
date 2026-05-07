import { prisma } from '../config/prisma.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { postToFacebook } from './facebook.service.js';

export async function listFanpages(userId: string) {
    return prisma.fanpage.findMany({ where: { userId } });
}

export async function updateToken(userId: string, id: string, accessToken: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    return prisma.fanpage.update({
        where: { id, userId },
        data: { 
            accessToken: encrypt(accessToken, user.email), 
            status: 'active' 
        }
    });
}

export async function removeFanpage(userId: string, id: string) {
    return prisma.fanpage.delete({ where: { id, userId } });
}

export async function postDirectly(userId: string, pageId: string, message: string, media?: any) {
    const fanpage = await prisma.fanpage.findFirst({ where: { pageId, userId } });
    if (!fanpage) throw new Error('Fanpage not found');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const decryptedToken = decrypt(fanpage.accessToken, user.email);
    
    // Normalize media to array
    let mediaArray = [];
    if (media) {
        if (typeof media === 'string') {
            try { mediaArray = JSON.parse(media); } catch { mediaArray = [{ type: 'image', data: media }]; }
        } else if (Array.isArray(media)) {
            mediaArray = media;
        } else {
            mediaArray = [media];
        }
    }

    const result = await postToFacebook({ content: message, imageUrl: JSON.stringify(mediaArray) }, fanpage, decryptedToken);

    if (result.error) throw new Error(result.error.message);

    // Track in DB
    await prisma.post.create({
        data: {
          content: message || '',
          imageUrl: mediaArray.length > 0 ? JSON.stringify(mediaArray) : null,
          fanpageId: pageId,
          userId,
          status: 'published',
          topic: 'Direct Post',
          fbPostId: result.id || result.post_id || null
        }
    });

    return result;
}

export async function publishVideoUrl(userId: string, pageId: string, videoUrl: string, message?: string) {
    const fanpage = await prisma.fanpage.findFirst({ where: { pageId, userId } });
    if (!fanpage) throw new Error('Fanpage not found');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const decryptedToken = decrypt(fanpage.accessToken, user.email);
    
    console.log(`[FB_VIDEO] Publishing cloud video to page ${pageId}: ${videoUrl}`);

    const params = new URLSearchParams();
    params.append('file_url', videoUrl);
    params.append('description', message || '');
    params.append('access_token', decryptedToken);

    const fbRes = await fetch(`https://graph.facebook.com/v18.0/${pageId}/videos`, {
        method: 'POST',
        body: params
    });

    const result = await fbRes.json();
    if (result.error) {
        console.error('[FB_VIDEO_ERROR]', result.error);
        throw new Error(result.error.message);
    }

    // Track in DB
    await prisma.post.create({
        data: {
          content: message || '',
          imageUrl: videoUrl,
          fanpageId: pageId,
          userId,
          status: 'published',
          topic: 'Video Synthesis Publish',
          fbPostId: result.id || null
        }
    });

    return result;
}
