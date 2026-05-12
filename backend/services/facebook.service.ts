import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Buffer } from 'buffer';
import { prisma } from '../config/prisma.js';
import { decrypt } from '../utils/encryption.js';
import { EventBusClient } from './EventBusClient.js';

const eb = new EventBusClient();

const __filename = typeof import.meta.url !== 'undefined' ? fileURLToPath(import.meta.url) : '';
const __dirname = __filename ? path.dirname(__filename) : process.cwd();
const PROJECT_ROOT = path.resolve(__dirname, __filename ? '../../' : './');

export async function postToFacebook(queuedPost: any, fanpage: any, decryptedToken: string) {
  let fbRes;
  let endpoint = 'feed';

  if (queuedPost.imageUrl) {
    let media = [];
    try {
      if (typeof queuedPost.imageUrl === 'string' && (queuedPost.imageUrl.startsWith('[') || queuedPost.imageUrl.startsWith('{'))) {
        media = JSON.parse(queuedPost.imageUrl);
      } else {
        // Handle raw URL string
        const isVideo = queuedPost.imageUrl.toLowerCase().endsWith('.mp4') || queuedPost.imageUrl.toLowerCase().includes('video');
        media = [{ type: isVideo ? 'video' : 'image', data: queuedPost.imageUrl }];
      }
      
      if (!Array.isArray(media)) {
         const isVideo = queuedPost.imageUrl.toLowerCase().endsWith('.mp4') || queuedPost.imageUrl.toLowerCase().includes('video');
         media = [{ type: isVideo ? 'video' : 'image', data: queuedPost.imageUrl }];
      }
    } catch (e) {
      const isVideo = String(queuedPost.imageUrl).toLowerCase().endsWith('.mp4') || String(queuedPost.imageUrl).toLowerCase().includes('video');
      media = [{ type: isVideo ? 'video' : 'image', data: queuedPost.imageUrl }];
    }

    if (media.length === 1) {
      const item = media[0];
      const formData = new FormData();
      formData.append('access_token', decryptedToken);
      
      if (item.type === 'video') {
        endpoint = 'videos';
        formData.append('description', queuedPost.content || '');
      } else {
        endpoint = 'photos';
        formData.append('message', queuedPost.content || '');
      }

      if (item.data.startsWith('http')) {
        const isInternal = item.data.includes('localhost') || item.data.includes('127.0.0.1') || item.data.includes('0.0.0.0');
        
        if (isInternal) {
           const filename = item.data.split('/').pop();
           const filePath = path.join(PROJECT_ROOT, 'public', 'uploads', filename || '');
           if (fs.existsSync(filePath)) {
              const buffer = fs.readFileSync(filePath);
              let mimeType = 'image/jpeg';
              if (filename?.endsWith('.png')) mimeType = 'image/png';
              if (filename?.endsWith('.mp4')) mimeType = 'video/mp4';
              
              const blob = new Blob([buffer], { type: mimeType });
              formData.append('source', blob, filename);
           } else {
              formData.append(item.type === 'video' ? 'file_url' : 'url', item.data);
           }
        } else {
           if (item.type === 'video') {
             formData.append('file_url', item.data);
           } else {
             formData.append('url', item.data);
           }
        }
        
        fbRes = await fetch(`https://graph.facebook.com/v18.0/${fanpage.pageId}/${endpoint}`, {
          method: 'POST',
          body: formData
        });
      } else {
        const parts = item.data.split(',');
        if (parts.length > 1) {
          const base64Data = parts[1];
          const mimeType = parts[0].split(';')[0].split(':')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const blob = new Blob([buffer], { type: mimeType });

          formData.append('source', blob, item.type === 'video' ? 'video.mp4' : 'image.png');

          fbRes = await fetch(`https://graph.facebook.com/v18.0/${fanpage.pageId}/${endpoint}`, {
            method: 'POST',
            body: formData
          });
        } else {
          throw new Error('Invalid media data format');
        }
      }
    } else if (media.length > 1) {
      const attachedMedia = [];
      endpoint = 'feed';

      for (const item of media) {
        const uploadFormData = new FormData();
        uploadFormData.append('access_token', decryptedToken);
        uploadFormData.append('published', 'false');

        if (item.data.startsWith('http')) {
           const isInternal = item.data.includes('localhost') || item.data.includes('0.0.0.0');
           if (isInternal) {
              const filename = item.data.split('/').pop();
              const filePath = path.join(PROJECT_ROOT, 'public', 'uploads', filename || '');
              if (fs.existsSync(filePath)) {
                 const buffer = fs.readFileSync(filePath);
                 let mimeType = 'image/jpeg';
                 if (filename?.endsWith('.png')) mimeType = 'image/png';
                 if (filename?.endsWith('.mp4')) mimeType = 'video/mp4';
                 const blob = new Blob([buffer], { type: mimeType });
                 uploadFormData.append('source', blob, filename);
              } else {
                 uploadFormData.append(item.type === 'video' ? 'file_url' : 'url', item.data);
              }
           } else {
              uploadFormData.append(item.type === 'video' ? 'file_url' : 'url', item.data);
           }
        } else {
          const parts = item.data.split(',');
          if (parts.length > 1) {
            const base64Data = parts[1];
            const mimeType = parts[0].split(';')[0].split(':')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const blob = new Blob([buffer], { type: mimeType });
            uploadFormData.append('source', blob, item.type === 'video' ? 'video.mp4' : 'image.png');
          } else {
            throw new Error('Invalid media data format in multiple upload');
          }
        }

        const uploadEndpoint = item.type === 'video' ? 'videos' : 'photos';
        const uploadRes = await fetch(`https://graph.facebook.com/v18.0/${fanpage.pageId}/${uploadEndpoint}`, {
          method: 'POST',
          body: uploadFormData
        });
        const uploadData = await uploadRes.json();
        if (uploadData.error) {
          console.error('[FACEBOOK] Upload error:', uploadData.error);
          throw new Error(uploadData.error.message);
        }
        attachedMedia.push({ media_fbid: uploadData.id });
      }

      fbRes = await fetch(`https://graph.facebook.com/v18.0/${fanpage.pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: queuedPost.content || '',
          access_token: decryptedToken,
          attached_media: attachedMedia
        })
      });
    }
  } else {
    endpoint = 'feed';
    fbRes = await fetch(`https://graph.facebook.com/v18.0/${fanpage.pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: queuedPost.content, access_token: decryptedToken })
    });
  }

  if (!fbRes) {
    throw new Error('No response from Facebook API');
  }

  const data = await fbRes.json();
  if (data.error) {
    console.error(`[FACEBOOK] API Error (${endpoint}):`, JSON.stringify(data.error, null, 2));
    throw new Error(data.error.message);
  }

  // Notify Event Bus that the reel has been published
  if (queuedPost.videoId) {
    eb.publish('REEL_PUBLISHED', {
      reelId: queuedPost.videoId,
      postId: queuedPost.id,
      fbPostId: data.id,
      fanpageId: fanpage.pageId,
      platform: 'facebook'
    }).catch(err => console.error('[EVENT BUS] Failed to publish REEL_PUBLISHED event:', err));
  }

  return data;
}
