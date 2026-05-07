import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Buffer } from 'buffer';
import { prisma } from '../config/prisma.js';
import { decrypt } from '../utils/encryption.js';

const __filename = typeof import.meta.url !== 'undefined' ? fileURLToPath(import.meta.url) : '';
const __dirname = __filename ? path.dirname(__filename) : process.cwd();
const PROJECT_ROOT = path.resolve(__dirname, __filename ? '../../' : './');

export async function postToFacebook(queuedPost: any, fanpage: any, decryptedToken: string) {
  let fbRes;
  if (queuedPost.imageUrl) {
    let media = [];
    try {
      media = JSON.parse(queuedPost.imageUrl);
      if (!Array.isArray(media)) {
         media = [{ type: 'image', data: queuedPost.imageUrl }];
      }
    } catch (e) {
      media = [{ type: 'image', data: queuedPost.imageUrl }];
    }

    if (media.length === 1) {
      const item = media[0];
      const formData = new FormData();
      formData.append('message', queuedPost.content || '');
      formData.append('access_token', decryptedToken);

      if (item.data.startsWith('http')) {
        const isInternal = item.data.includes('localhost') || item.data.includes('127.0.0.1') || item.data.includes('0.0.0.0');
        
        if (isInternal) {
           const filename = item.data.split('/').pop();
           const filePath = path.join(PROJECT_ROOT, 'public', 'uploads', filename || '');
           if (fs.existsSync(filePath)) {
              const buffer = fs.readFileSync(filePath);
              const mimeType = filename?.endsWith('.png') ? 'image/png' : 'image/jpeg';
              const blob = new Blob([buffer], { type: mimeType });
              formData.append('source', blob, filename);
           } else {
              formData.append('url', item.data);
           }
        } else {
           if (item.type === 'video') {
             formData.append('file_url', item.data);
             // Also add description for videos
             formData.append('description', queuedPost.content || '');
           } else {
             formData.append('url', item.data);
           }
        }
        
        const endpoint = item.type === 'video' ? 'videos' : 'photos';
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

          const endpoint = item.type === 'video' ? 'videos' : 'photos';
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
      for (const item of media) {
        const formData = new FormData();
        formData.append('access_token', decryptedToken);
        formData.append('published', 'false');

        if (item.data.startsWith('http')) {
           const isInternal = item.data.includes('localhost') || item.data.includes('0.0.0.0');
           if (isInternal) {
              const filename = item.data.split('/').pop();
              const filePath = path.join(PROJECT_ROOT, 'public', 'uploads', filename || '');
              if (fs.existsSync(filePath)) {
                 const buffer = fs.readFileSync(filePath);
                 const mimeType = filename?.endsWith('.png') ? 'image/png' : 'image/jpeg';
                 const blob = new Blob([buffer], { type: mimeType });
                 formData.append('source', blob, filename);
              } else {
                 formData.append('url', item.data);
              }
           } else {
              formData.append('url', item.data);
           }
        } else {
          const parts = item.data.split(',');
          if (parts.length > 1) {
            const base64Data = parts[1];
            const mimeType = parts[0].split(';')[0].split(':')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const blob = new Blob([buffer], { type: mimeType });
            formData.append('source', blob, item.type === 'video' ? 'video.mp4' : 'image.png');
          } else {
            throw new Error('Invalid media data format in multiple upload');
          }
        }

        const endpoint = item.type === 'video' ? 'videos' : 'photos';
        const uploadRes = await fetch(`https://graph.facebook.com/v18.0/${fanpage.pageId}/${endpoint}`, {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadData.error) throw new Error(uploadData.error.message);
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
    fbRes = await fetch(`https://graph.facebook.com/v18.0/${fanpage.pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: queuedPost.content, access_token: decryptedToken })
    });
  }

  const data = await fbRes.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}
