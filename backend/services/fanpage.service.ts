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

export async function postDirectly(userId: string, pageId: string, message: string, media?: any[], uploadedFiles?: any[]) {
    const fanpage = await prisma.fanpage.findFirst({ where: { pageId, userId } });
    if (!fanpage) throw new Error('Fanpage not found');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const decryptedToken = decrypt(fanpage.accessToken, user.email);
    let result;

    if (uploadedFiles && uploadedFiles.length > 0) {
        // Handle physical upload
        const file = uploadedFiles[0];
        const formData = new FormData();
        formData.append('message', message || '');
        formData.append('access_token', decryptedToken);
        const blob = new Blob([file.buffer], { type: file.mimetype });
        formData.append('source', blob, file.originalname);
        
        const type = file.mimetype.startsWith('video') ? 'videos' : 'photos';
        const fbRes = await fetch(`https://graph.facebook.com/v18.0/${pageId}/${type}`, { method: 'POST', body: formData });
        result = await fbRes.json();
    } else {
        // Use service
        result = await postToFacebook({ content: message, imageUrl: media ? JSON.stringify(media) : null }, fanpage, decryptedToken);
    }

    if (result.error) throw new Error(result.error.message);

    // Track in DB
    await prisma.post.create({
        data: {
          content: message || '',
          imageUrl: media ? JSON.stringify(media) : null,
          fanpageId: pageId,
          userId,
          status: 'published',
          topic: 'Direct Post',
          fbPostId: result.id || result.post_id || null
        }
    });

    return result;
}
