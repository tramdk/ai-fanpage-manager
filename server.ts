import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Buffer } from 'buffer';
import nodeCron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- CLOUDINARY UPLOAD HELPER ---
async function uploadBufferToCloudinary(buffer: Buffer, folder: string = 'ai-fanpage-manager'): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Cloudinary upload failed: no result'));
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- ENCRYPTION UTILITY ---
const ALGORITHM = 'aes-256-cbc';

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || 'neural-ops-vault-key-2026';

function getEncryptionKey(email: string): Buffer {
  return crypto.createHash('sha256').update(email + ENCRYPTION_SECRET).digest();
}

function encrypt(text: string, email: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey(email);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText: string, email: string): string {
  if (!encryptedText) return encryptedText;
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return encryptedText;
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = getEncryptionKey(email);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedText;
  }
}

// Initialize Prisma
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// GenAI Model fallback list
const GENAI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-pro-latest',
  'gemini-1.5-flash-002',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

function cleanAIResult(text: string): string {
  if (!text) return text;
  let cleaned = text.trim();
  
  // Remove markdown code blocks if the response is wrapped in them
  if (cleaned.startsWith('```')) {
    const lines = cleaned.split('\n');
    // If it ends with ``` we take the middle
    if (cleaned.endsWith('```')) {
       // Find first newline after ```
       const firstNewline = cleaned.indexOf('\n');
       if (firstNewline !== -1) {
         cleaned = cleaned.substring(firstNewline, cleaned.length - 3).trim();
       }
    } else {
       // Just remove the starting ```[language]
       const firstNewline = cleaned.indexOf('\n');
       if (firstNewline !== -1) {
         cleaned = cleaned.substring(firstNewline).trim();
       }
    }
  }

  // Remove common intro phrases (case insensitive, multiple languages)
  const patterns = [
    /^Sure, here (is|are) [^:]+:\s*/i,
    /^Here is (the|a) [^:]+:\s*/i,
    /^Certainly! Here [^:]+:\s*/i,
    /^Sẵn lòng, đây là [^:]+:\s*/i,
    /^Đây là nội dung [^:]+:\s*/i,
    /^Dưới đây là [^:]+:\s*/i,
    /^Nội dung bài viết:\s*/i,
    /^Nội dung Facebook Post:\s*/i,
    /^Title:\s*/i,
    /^Caption:\s*/i
  ];

  for (const pattern of patterns) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, '').trim();
    }
  }

  // Remove surrounding quotes if they wrap the entire result
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.substring(1, cleaned.length - 1).trim();
  }

  return cleaned;
}

// Middleware to verify JWT
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    
    try {
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      req.user = { ...decoded, requirePasswordChange: user.requirePasswordChange };
      
      // If password change is required, block all requests except password update and identity check
      if (user.requirePasswordChange && req.path !== '/api/users/password' && req.path !== '/api/auth/me') {
        return res.status(403).json({ 
          error: 'Password change required', 
          requirePasswordChange: true 
        });
      }
      
      next();
    } catch (e) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

// Store active cron jobs so we can stop them
const activeCronJobs = new Map<string, any>();

function scheduleJob(schedule: any) {
  const [hour, minute] = schedule.time.split(':');
  const cronExpression = `${minute} ${hour} * * *`;

  const task = nodeCron.schedule(cronExpression, async () => {
    console.log(`[CRON] Executing scheduled post for topic: ${schedule.topic}`);
    try {
      // Fetch fresh fanpage data to get the latest access token
      const fanpage = await prisma.fanpage.findUnique({
        where: { pageId: schedule.fanpageId },
        include: { user: true }
      });
      if (!fanpage || !fanpage.accessToken || !fanpage.user) {
        console.error(`[CRON] Fanpage not found or missing access token for schedule ${schedule.id}`);
        return;
      }

      const decryptedToken = decrypt(fanpage.accessToken, fanpage.user.email);

      // Find a queued post for this schedule
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
        console.log(`[CRON] No queued posts found for topic ${schedule.topic}. Please generate a batch in the Automation tab.`);
        return;
      }

      // Post to Facebook
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
               // [FIX] Read local file for Cron/Automation
               const filename = item.data.split('/').pop();
               const filePath = path.join(__dirname, 'public', 'uploads', filename || '');
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
            
            fbRes = await fetch(`https://graph.facebook.com/v18.0/${fanpage.pageId}/photos`, {
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
              throw new Error('Invalid media data format (not a URL and no base64 prefix)');
            }
          }
        } else if (media.length > 1) {
          // Multiple media
          const attachedMedia = [];
          for (const item of media) {
            const formData = new FormData();
            formData.append('access_token', decryptedToken);
            formData.append('published', 'false');

            if (item.data.startsWith('http')) {
               const isInternal = item.data.includes('localhost') || item.data.includes('0.0.0.0');
               if (isInternal) {
                  const filename = item.data.split('/').pop();
                  const filePath = path.join(__dirname, 'public', 'uploads', filename || '');
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

          // Now post to feed
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

      // Update post status to published
      await prisma.post.update({
        where: { id: queuedPost.id },
        data: { status: 'published', error: null }
      });

      console.log(`[CRON] Successfully posted scheduled content for topic: ${schedule.topic}, Post ID: ${data.id}`);

      // Check if any queued posts remain
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
        console.log(`[CRON] Schedule ${schedule.id} exhausted its queued posts and is now suspended.`);
      }
    } catch (error: any) {
      console.error(`[CRON] Failed to execute scheduled post for topic ${schedule.topic}:`, error);

      // Try to update the queued post to failed status if we have one
      try {
        const queuedPost = await prisma.post.findFirst({
          where: {
            scheduleId: schedule.id,
            status: 'queued',
            fanpageId: schedule.fanpageId
          },
          orderBy: { createdAt: 'asc' }
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Create root admin if not exists
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@floral.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Root Admin',
          role: 'admin',
          isActive: true
        }
      });
      console.log(`Root admin created: ${adminEmail} / ${adminPassword}`);
    }
  } catch (err) {
    console.error('Failed to create root admin:', err);
  }

  // Load existing schedules from database on startup
  try {
    const existingSchedules = await prisma.schedule.findMany({ 
      where: { status: 'active' },
      include: { fanpage: true } 
    });
    console.log(`Loading ${existingSchedules.length} schedules from database...`);
    for (const schedule of existingSchedules) {
      scheduleJob(schedule);
    }
  } catch (err) {
    console.error('Failed to load schedules from database:', err);
  }

  // Increase payload limit for base64 images and videos
  app.use(express.json({ limit: '20MB' }));
  app.use(express.urlencoded({ limit: '20MB', extended: true }));

  // --- AUTHENTICATION ROUTES ---
  app.post('/api/auth/register', async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) return res.status(400).json({ error: 'User already exists' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, password: hashedPassword, name }
      });

      // Don't log them in immediately if they need activation
      res.json({ message: 'Registration successful. Please wait for an admin to activate your account.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/auth/setup-password', async (req, res) => {
    const { setupToken, newPassword } = req.body;
    if (!setupToken || !newPassword) return res.status(400).json({ error: 'Missing required fields' });

    try {
      const decoded = jwt.verify(setupToken, JWT_SECRET) as any;
      if (!decoded.isSetup) return res.status(401).json({ error: 'Invalid token type' });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: decoded.id },
        data: { 
          password: hashedPassword,
          requirePasswordChange: false 
        }
      });
      res.json({ message: 'Security protocol completed. Password updated.' });
    } catch (error: any) {
      res.status(401).json({ error: 'Session expired or invalid' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(400).json({ error: 'Invalid credentials' });

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

      // [SECURITY] Check if user is using a "Default" password (from ENV or Admin Reset)
      const defaultAdminEmail = process.env.ADMIN_EMAIL || 'admin@floral.com';
      const defaultAdminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const tempPassword = 'password@123';

      const isDefaultRoot = (email === defaultAdminEmail && password === defaultAdminPassword);
      const isTempPassword = (password === tempPassword && user.requirePasswordChange);

      if (isDefaultRoot || isTempPassword) {
         // Create a RESTRICTED token that only allows password change
         const setupToken = jwt.sign({ 
           id: user.id, 
           isSetup: true 
         }, JWT_SECRET, { expiresIn: '15m' });
         
         return res.status(403).json({ 
           error: 'PASSWORD_CHANGE_REQUIRED', 
           setupToken,
           user: { id: user.id, email: user.email, name: user.name }
         });
      }

      if (!user.isActive && user.role !== 'admin') {
        return res.status(403).json({ error: 'Account is pending activation by an admin.' });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- DASHBOARD ROUTE ---
  app.get('/api/dashboard', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;

      const totalFanpages = await prisma.fanpage.count({ where: { userId } });
      const totalPosts = await prisma.post.count({ where: { userId, status: 'published' } });
      const scheduledPosts = await prisma.post.count({ where: { userId, status: 'queued' } });

      const recentPosts = await prisma.post.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { fanpage: { select: { name: true } } }
      });

      res.json({
        stats: {
          totalFanpages,
          totalPosts,
          scheduledPosts
        },
        recentPosts: recentPosts.map((post: any) => ({
          id: post.id,
          content: post.content,
          topic: post.topic,
          status: post.status,
          createdAt: post.createdAt,
          fanpageName: post.fanpage?.name || 'Unknown Page'
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- USER SETTINGS ROUTES ---
  app.get('/api/users/facebook-config', authenticateToken, async (req: any, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      res.json({
        facebookAppId: user.facebookAppId ? decrypt(user.facebookAppId, user.email) : '',
        hasSecret: !!user.facebookAppSecret
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/users/profile', authenticateToken, async (req: any, res) => {
    const { name } = req.body;
    try {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { name }
      });
      res.json({ message: 'Profile updated successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/users/password', authenticateToken, async (req: any, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) return res.status(400).json({ error: 'Current password is incorrect' });

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: req.user.id },
        data: { 
          password: hashedNewPassword,
          requirePasswordChange: false 
        }
      });
      res.json({ message: 'Password updated successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/users/facebook-config', authenticateToken, async (req: any, res) => {
    const { facebookAppId, facebookAppSecret } = req.body;
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Legacy fallback
      const dataToUpdate: any = {
        facebookAppId: facebookAppId ? encrypt(facebookAppId, user.email) : null
      };

      if (facebookAppSecret) {
        dataToUpdate.facebookAppSecret = encrypt(facebookAppSecret, user.email);
      }

      await prisma.user.update({
        where: { id: req.user.id },
        data: dataToUpdate
      });

      // Also create/update a FacebookApp record if possible
      if (facebookAppId && facebookAppSecret) {
        await prisma.facebookApp.upsert({
          where: { id: 'legacy-root' }, // A fixed ID for the root config if desired, or skip
          update: { appId: encrypt(facebookAppId, user.email), appSecret: encrypt(facebookAppSecret, user.email), name: 'Primary App' },
          create: { id: 'legacy-root', appId: encrypt(facebookAppId, user.email), appSecret: encrypt(facebookAppSecret, user.email), name: 'Primary App', userId: user.id }
        });
      }

      res.json({ message: 'Facebook configuration saved successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- NEW FACEBOOK APP MANAGEMENT ROUTES ---
  app.get('/api/facebook-apps', authenticateToken, async (req: any, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      let apps = await prisma.facebookApp.findMany({
        where: { userId: req.user.id }
      });

      // Auto-migrate legacy if no apps exist
      const hasLegacy = user.facebookAppId && user.facebookAppId.length > 5; // Encrypted strings are usually long
      if (apps.length === 0 && hasLegacy) {
        console.log(`[AUTH] Migration Triggered: User ${user.id} has legacy config but 0 records.`);
        try {
          const migratedApp = await prisma.facebookApp.create({
            data: {
              appId: user.facebookAppId,
              appSecret: user.facebookAppSecret || '', // Fallback to empty if not set
              name: 'Primary App (Legacy)',
              userId: user.id
            }
          });
          console.log(`[AUTH] Successfully migrated legacy Facebook app for user ${user.id}`);
          apps = [migratedApp];
        } catch (e) {
          console.error('[AUTH] Failed to migrate legacy Facebook app:', e);
        }
      } else if (apps.length > 0) {
        console.log(`[AUTH] Found ${apps.length} apps for user ${user.id}`);
      }

      res.json(apps.map(app => ({
        id: app.id,
        appId: decrypt(app.appId, user.email),
        name: app.name || 'Unnamed App',
        createdAt: app.createdAt
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/facebook-apps', authenticateToken, async (req: any, res) => {
    const { appId, appSecret, name } = req.body;
    if (!appId || !appSecret) return res.status(400).json({ error: 'App ID and Secret are required' });

    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const newApp = await prisma.facebookApp.create({
        data: {
          appId: encrypt(appId, user.email),
          appSecret: encrypt(appSecret, user.email),
          name: name || 'New App',
          userId: user.id
        }
      });

      res.json({ id: newApp.id, message: 'Facebook App added successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/facebook-apps/:id', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    try {
      await prisma.facebookApp.delete({
        where: { id, userId: req.user.id }
      });
      res.json({ message: 'App removed successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin Middleware
  const authenticateAdmin = async (req: any, res: any, next: any) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      next();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Admin Routes
  app.get('/api/admin/users', authenticateToken, authenticateAdmin, async (req: any, res) => {
    try {
      const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/admin/users/:id/status', authenticateToken, authenticateAdmin, async (req: any, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { isActive }
      });
      res.json({ success: true, user: { id: user.id, isActive: user.isActive } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/users/:id/reset-password', authenticateToken, authenticateAdmin, async (req: any, res) => {
    const { id } = req.params;
    const tempPassword = 'password@123';
    try {
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      await prisma.user.update({
        where: { id },
        data: { 
          password: hashedPassword,
          requirePasswordChange: true 
        }
      });
      res.json({ success: true, message: `Password reset to: ${tempPassword}` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route to generate Facebook OAuth URL
  app.get('/api/auth/facebook/url', async (req, res) => {
    const origin = (req.query.origin as string) || process.env.APP_URL || '';
    const token = (req.query.token as string) || '';
    const fbAppRecordId = req.query.fbAppRecordId as string;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let user;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) throw new Error('User not found');
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    let appId, appSecret, appRecordId = fbAppRecordId;

    if (fbAppRecordId) {
       const appObj = await prisma.facebookApp.findFirst({ where: { id: fbAppRecordId, userId: user.id } });
       if (appObj) {
         appId = decrypt(appObj.appId, user.email);
         appSecret = decrypt(appObj.appSecret, user.email);
       }
    }

    // Fallback to legacy
    if (!appId || !appSecret) {
       appId = user.facebookAppId ? decrypt(user.facebookAppId, user.email) : process.env.FACEBOOK_APP_ID;
       appSecret = user.facebookAppSecret ? decrypt(user.facebookAppSecret, user.email) : process.env.FACEBOOK_APP_SECRET;
       appRecordId = 'legacy';
    }

    if (!appId || !appSecret) {
      return res.status(400).json({
        error: 'Please configure your Facebook App ID and Secret first.',
        requires_config: true
      });
    }

    const cleanOrigin = origin.replace(/\/$/, '');
    const redirectUri = `${cleanOrigin}/auth/facebook/callback`;

    // Pass origin, token AND app info in state
    const stateObj = { origin: cleanOrigin, token, appRecordId };
    const stateStr = Buffer.from(JSON.stringify(stateObj)).toString('base64');

    // Facebook OAuth URL parameters
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'pages_show_list,pages_read_engagement,pages_manage_posts',
      state: stateStr
    });

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
    res.json({ url: authUrl });
  });

  // Facebook OAuth Callback Route
  app.get(['/auth/facebook/callback', '/auth/facebook/callback/'], async (req, res) => {
    const { code, error, error_description, state } = req.query;

    if (error) {
      const errorMessage = error_description || error;
      return res.send(`
        <html><body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'FACEBOOK_AUTH_ERROR', error: '${errorMessage}' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication failed. This window should close automatically.</p>
        </body></html>
      `);
    }

    try {
      let cleanOrigin = process.env.APP_URL?.replace(/\/$/, '') || '';
      let token = '';
      let appRecordId = 'legacy';

      if (state) {
        try {
          const stateObj = JSON.parse(Buffer.from(state as string, 'base64').toString('utf-8'));
          cleanOrigin = stateObj.origin || cleanOrigin;
          token = stateObj.token || '';
          appRecordId = stateObj.appRecordId || 'legacy';
        } catch (e) {
          console.error('Failed to parse state:', e);
        }
      }
      
      // Verify user token
      let user = null;
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          user = await prisma.user.findUnique({ where: { id: decoded.id } });
        } catch (e) {
          console.error('Invalid token in OAuth callback:', e);
        }
      }

      if (!user) {
        throw new Error('User not authenticated. Please log in first.');
      }

      let appId, appSecret;

      if (appRecordId && appRecordId !== 'legacy') {
         const appObj = await prisma.facebookApp.findUnique({ where: { id: appRecordId, userId: user.id } });
         if (appObj) {
            appId = decrypt(appObj.appId, user.email);
            appSecret = decrypt(appObj.appSecret, user.email);
         }
      }

      if (!appId || !appSecret) {
        appId = user.facebookAppId ? decrypt(user.facebookAppId, user.email) : process.env.FACEBOOK_APP_ID;
        appSecret = user.facebookAppSecret ? decrypt(user.facebookAppSecret, user.email) : process.env.FACEBOOK_APP_SECRET;
        appRecordId = null; // Mark as legacy in DB if needed
      }

      if (!appId || !appSecret) {
        throw new Error('Facebook App ID or Secret not configured.');
      }

      const redirectUri = `${cleanOrigin}/auth/facebook/callback`;

      const tokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`);
      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error('Facebook Token Error:', tokenData.error);
        throw new Error(tokenData.error.message || 'Failed to exchange token');
      }

      const shortLivedToken = tokenData.access_token;
      console.log('Got short-lived user token. Exchanging for long-lived token...');

      // [UPGRADE] Exchange short-lived token for long-lived token (60 days)
      const longLivedResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`);
      const longLivedData = await longLivedResponse.json();

      if (longLivedData.error) {
         console.error('Failed to upgrade token:', longLivedData.error);
         // Fallback to short-lived if upgrade fails, though not ideal
      }
      
      const userAccessToken = longLivedData.access_token || shortLivedToken;

      // Fetch pages using the long-lived token (to get permanent page tokens)
      const pagesResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${userAccessToken}&limit=100`);
      const pagesData = await pagesResponse.json();

      if (pagesData.error) {
        console.error('Facebook Pages Error:', pagesData.error);
        throw new Error(pagesData.error.message || 'Failed to fetch pages');
      }

      const pages = pagesData.data;

      // Save or update pages in database
      for (const page of pages) {
        const encryptedToken = encrypt(page.access_token, user.email);
        await prisma.fanpage.upsert({
          where: { pageId: page.id },
          update: {
            name: page.name,
            accessToken: encryptedToken,
            status: 'active',
            userId: user.id,
            facebookAppId: appRecordId && appRecordId !== 'legacy' ? appRecordId : null
          },
          create: {
            pageId: page.id,
            name: page.name,
            accessToken: encryptedToken,
            status: 'active',
            userId: user.id,
            facebookAppId: appRecordId && appRecordId !== 'legacy' ? appRecordId : null
          }
        });
      }

      res.send(`
        <html><body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'FACEBOOK_AUTH_SUCCESS', 
                payload: ${JSON.stringify(pages)}
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body></html>
      `);
    } catch (err: any) {
      res.send(`
        <html><body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'FACEBOOK_AUTH_ERROR', error: '${err.message}' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication failed: ${err.message}</p>
        </body></html>
      `);
    }
  });

  // Manually update access token for a Fanpage
  app.patch('/api/fanpages/:id/token', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'Access Token is required' });

    try {
      const fanpage = await prisma.fanpage.findFirst({ where: { id, userId: req.user.id } });
      if (!fanpage) return res.status(404).json({ error: 'Fanpage not found' });

      // Encrypt the new token before saving
      const encryptedToken = encrypt(accessToken, req.user.email);
      await prisma.fanpage.update({
        where: { id },
        data: { accessToken: encryptedToken, status: 'active' }
      });

      res.json({ message: 'Token updated successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
  });

  // API Route to post to Facebook
  app.post('/api/facebook/post', authenticateToken, upload.array('mediaFiles'), async (req: any, res) => {
    const { pageId, message, topic } = req.body;
    let media = [];
    try {
      if (req.body.media) {
         media = JSON.parse(req.body.media);
      }
    } catch {
      media = req.body.media || [];
    }
    const uploadedFiles = req.files as Express.Multer.File[] | undefined;

    if (!pageId || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      // Fetch the fanpage from DB to get the token securely
      const fanpage = await prisma.fanpage.findFirst({
        where: { pageId, userId: req.user.id }
      });

      if (!fanpage) {
        return res.status(404).json({ error: 'Fanpage not found or not authorized' });
      }

      const decryptedToken = decrypt(fanpage.accessToken, req.user.email);
      let fbRes;

      if ((media && media.length > 0) || (uploadedFiles && uploadedFiles.length > 0)) {
        const totalMedia = (media ? media.length : 0) + (uploadedFiles ? uploadedFiles.length : 0);
        
        if (totalMedia === 1) {
          // Single media
          const formData = new FormData();
          formData.append('message', message);

          if (uploadedFiles && uploadedFiles.length > 0) {
            const file = uploadedFiles[0];
            const mimeType = file.mimetype || 'application/octet-stream';
            const blob = new Blob([new Uint8Array(file.buffer)], { type: mimeType });
            formData.append('source', blob, file.originalname || 'upload.png');
            
            fbRes = await fetch(`https://graph.facebook.com/v18.0/${pageId}/${mimeType.startsWith('video') ? 'videos' : 'photos'}?access_token=${decryptedToken}`, {
              method: 'POST',
              body: formData
            });
          } else {
            const item = media[0];
            if (item.data.startsWith('http')) {
              const isInternal = item.data.includes('localhost') || 
                               item.data.includes('127.0.0.1') || 
                               item.data.includes('0.0.0.0') || 
                               item.data.includes(req.get('host') || '');
              
              if (isInternal) {
                 const filename = item.data.split('/').pop();
                 const filePath = path.join(__dirname, 'public', 'uploads', filename || '');
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
              
              fbRes = await fetch(`https://graph.facebook.com/v18.0/${pageId}/photos?access_token=${decryptedToken}`, {
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
                fbRes = await fetch(`https://graph.facebook.com/v18.0/${pageId}/${endpoint}?access_token=${decryptedToken}`, {
                  method: 'POST',
                  body: formData
                });
              } else {
                throw new Error('Invalid media data format');
              }
            }
          }
        } else {
          // Multiple media
          const attachedMedia = [];
          
          // Process string media OR internal URL
          if (media && media.length > 0) {
            for (const item of media) {
              const formData = new FormData();
              formData.append('published', 'false');

              if (item.data.startsWith('http')) {
                formData.append('url', item.data);
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
              const uploadRes = await fetch(`https://graph.facebook.com/v18.0/${pageId}/${endpoint}?access_token=${decryptedToken}`, {
                method: 'POST',
                body: formData
              });
              const uploadData = await uploadRes.json();
              if (uploadData.error) throw new Error(uploadData.error.message);
              attachedMedia.push({ media_fbid: uploadData.id });
            }
          }
          
          // Process uploaded files
          if (uploadedFiles && uploadedFiles.length > 0) {
            for (const file of uploadedFiles) {
              const formData = new FormData();
              formData.append('published', 'false');
              
              const mimeType = file.mimetype || 'application/octet-stream';
              const blob = new Blob([new Uint8Array(file.buffer)], { type: mimeType });
              formData.append('source', blob, file.originalname || 'upload.png');
              
              const endpoint = mimeType.startsWith('video') ? 'videos' : 'photos';
              const uploadRes = await fetch(`https://graph.facebook.com/v18.0/${pageId}/${endpoint}?access_token=${decryptedToken}`, {
                method: 'POST',
                body: formData
              });
              const uploadData = await uploadRes.json();
              if (uploadData.error) throw new Error(uploadData.error.message);
              attachedMedia.push({ media_fbid: uploadData.id });
            }
          }

          // Now post to feed
          fbRes = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message,
              access_token: decryptedToken,
              attached_media: attachedMedia
            })
          });
        }
      } else {
        // Text only
        fbRes = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, access_token: decryptedToken })
        });
      }

      const data = await fbRes.json();
      if (data.error) throw new Error(data.error.message);

      // Save post to database
      await prisma.post.create({
        data: {
          topic: topic || 'Manual Post',
          content: message,
          imageUrl: media && media.length > 0 ? media[0].data : null, // Store first media for preview
          fanpageId: pageId,
          status: 'published',
          userId: req.user.id
        }
      });

      res.json({ success: true, id: data.id });
    } catch (error: any) {
      console.error('Facebook Post Error:', error);
      
      const errMsg = error.message || '';
      if (
        errMsg.includes('token') || 
        errMsg.includes('publish_actions') || 
        errMsg.includes('OAuth') || 
        errMsg.includes('Error validating')
      ) {
        try {
          await prisma.fanpage.updateMany({
            where: { pageId, userId: req.user.id },
            data: { status: 'expired' }
          });
        } catch (dbErr) {
          console.error('Failed to update fanpage status:', dbErr);
        }
      }

      res.status(500).json({ error: error.message });
    }
  });

  // API Route to get context for AI generation
  app.get('/api/posts/context', authenticateToken, async (req: any, res) => {
    const { topic } = req.query;
    if (!topic) return res.json([]);

    try {
      const previousPosts = await prisma.post.findMany({
        where: { topic: String(topic), userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { content: true }
      });
      res.json(previousPosts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- AI GENERATION ENDPOINTS ---

  // Generate text content via server-side GenAI
  app.post('/api/ai/generate-text', authenticateToken, async (req: any, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      // Mock mode
      return res.json({ text: `[MOCK] Nội dung AI cho: ${prompt.substring(0, 80)}...`, mock: true });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      let lastError: any = null;

      for (const model of GENAI_MODELS) {
        try {
          const response = await ai.models.generateContent({ model, contents: prompt });
          if (response.text) {
            return res.json({ text: cleanAIResult(response.text) });
          }
        } catch (e: any) {
          lastError = e;
          continue;
        }
      }

      const errorMsg = lastError?.message || 'All models failed';
      if (errorMsg.includes('429') || errorMsg.includes('quota')) {
        return res.status(429).json({ error: 'Gemini API quota exceeded. Please try again later or use a different API key.', detail: errorMsg });
      }
      res.status(500).json({ error: 'Failed to generate text content', detail: errorMsg });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate image via server-side GenAI
  app.post('/api/ai/generate-image', authenticateToken, async (req: any, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const apiKey = process.env.GEMINI_API_KEY;
    const hasValidKey = apiKey && apiKey !== 'MY_GEMINI_API_KEY';

    const getKeywordsFallback = (promptText: string) => {
      const words = promptText.split(' ').filter(w => w.length > 2 && !['professional', 'image', 'stunning', 'product', 'photography'].includes(w.toLowerCase()));
      return encodeURIComponent(words.slice(-3).join(','));
    };

    console.log(`[AI-IMAGE-START] New request for prompt: "${prompt}"`);
    const startTime = Date.now();

    if (hasValidKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        
        // 1. PHASE 1: Use Gemini to expand the prompt
        console.log(`[AI-IMAGE] Step 1: Refining prompt with Gemini...`);
        let refinedPrompt = prompt;
        try {
          const promptExpander = `Act as an elite AI prompt engineer for High-End Commercial Photography.
          Transform this basic concept into a master-level ENGLISH Stable Diffusion prompt.
          REQUIREMENTS:
          - Style: Professional, Cinematic, Photorealistic, 8k resolution, Masterpiece.
          - Context: Add specific details about lighting (soft sun, rim light, volumetric), textures (4k detail), and professional camera gear (Sony A7R IV, 85mm lens).
          - Limit: Keep it within 100 words.
          - NO introductory text. Just the prompt.
          ORIGINAL CONCEPT: "${prompt}"`;
          
          const response = await ai.models.generateContent({ model: GENAI_MODELS[0], contents: promptExpander });
          refinedPrompt = response?.text?.trim() || prompt;
          console.log(`[AI-IMAGE] Gemini Refined Prompt: "${refinedPrompt}"`);
        } catch (e: any) {
          console.error(`[AI-IMAGE-ERROR] Gemini expansion failed:`, e.message);
        }

        // 2. PHASE 2: Generate with Pollinations (Flux/SDXL mix)
        const seed = Math.floor(Math.random() * 9999999);
        const aiGenUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(refinedPrompt)}?width=1024&height=1024&nologo=true&enhance=true&seed=${seed}`;
        
        console.log(`[AI-IMAGE] Step 2: Requesting physical generation from: ${aiGenUrl.substring(0, 150)}...`);
        
        try {
          const genStartTime = Date.now();
          const imageRes = await fetch(aiGenUrl);
          
          if (!imageRes.ok) {
            console.error(`[AI-IMAGE-ERROR] Generation API returned status: ${imageRes.status}`);
            throw new Error('AI Generation service failed');
          }
          
          const buffer = await imageRes.arrayBuffer();
          const bufferData = Buffer.from(buffer);
          
          // Upload to Cloudinary instead of local FS
          let absoluteUrl;
          try {
            absoluteUrl = await uploadBufferToCloudinary(bufferData);
          } catch (err: any) {
            // Fallback to local if Cloudinary fails/not configured
            console.warn(`[AI-IMAGE-WARN] Cloudinary upload failed, falling back to local:`, err.message);
            const fileName = `ai_${Date.now()}_${Math.floor(Math.random()*1000)}.jpg`;
            const filePath = path.join(__dirname, 'public', 'uploads', fileName);
            const uploadsDir = path.join(__dirname, 'public', 'uploads');
            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
            fs.writeFileSync(filePath, bufferData);
            const host = req.get('host');
            const protocol = req.protocol;
            absoluteUrl = `${protocol}://${host}/api/media/${fileName}`;
          }
          
          const totalDuration = (Date.now() - startTime) / 1000;
          console.log(`[AI-IMAGE-SUCCESS] Generated in ${totalDuration}s. URL: ${absoluteUrl}`);
          
          return res.json({ 
            imageUrl: absoluteUrl, 
            mock: false, 
            refinedPrompt, 
            debug: { duration: totalDuration, seed } 
          });
        } catch (e: any) {
          console.error(`[AI-IMAGE-ERROR] Physical creation failed:`, e.message);
        }

      } catch (error: any) {
        console.error(`[AI-IMAGE-FATAL] Workflow crashed:`, error.message);
      }
    }

    // Default Fallback
    console.warn(`[AI-IMAGE-FALLBACK] Deploying LoremFlickr safety net for: "${prompt}"`);
    const keyword = getKeywordsFallback(prompt);
    const mockUrl = `https://loremflickr.com/1024/1024/${keyword}?lock=${Date.now()}`;
    
    try {
      const imageRes = await fetch(mockUrl);
      const buffer = await imageRes.arrayBuffer();
      const bufferData = Buffer.from(buffer);

      // Upload fallback to Cloudinary
      let absoluteUrl;
      try {
        absoluteUrl = await uploadBufferToCloudinary(bufferData);
      } catch (err: any) {
        console.warn(`[AI-IMAGE-WARN] Cloudinary fallback failed, using local FS:`, err.message);
        const fileName = `fallback_${Date.now()}_${Math.floor(Math.random()*1000)}.jpg`;
        const filePath = path.join(__dirname, 'public', 'uploads', fileName);
        const uploadsDir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        fs.writeFileSync(filePath, bufferData);
        const host = req.get('host');
        const protocol = req.protocol;
        absoluteUrl = `${protocol}://${host}/api/media/${fileName}`;
      }
      
      return res.json({ imageUrl: absoluteUrl, mock: true, keywords: keyword });
    } catch (err: any) {
      console.error(`[AI-IMAGE-TOTAL-FAILURE]`, err.message);
      res.json({ imageUrl: mockUrl, mock: true });
    }
  });

  // API Route to save a queued post
  app.post('/api/posts/queue', authenticateToken, async (req: any, res) => {
    const { topic, content, imageUrl, fanpageId, scheduleId } = req.body;
    console.log(`[QUEUE] Topic: ${topic}, Image: ${imageUrl ? (imageUrl.length > 100 ? imageUrl.substring(0, 100) + '...' : imageUrl) : 'NONE'}`);
    try {
      const post = await prisma.post.create({
        data: {
          topic,
          content,
          imageUrl: imageUrl || null,
          fanpageId,
          scheduleId,
          status: 'queued',
          orderIndex: req.body.orderIndex || 0,
          userId: req.user.id
        }
      });
      res.json({ success: true, post });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route to get topics
  app.get('/api/topics', authenticateToken, async (req: any, res) => {
    try {
      let topics = await prisma.topic.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' }
      });

      if (topics.length === 0) {
        return res.json([]);
      }

      res.json(topics.map(t => ({
        id: t.id,
        name: t.name,
        keywords: t.keywords.split(',').map(k => k.trim())
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route to create a topic
  app.post('/api/topics', authenticateToken, async (req: any, res) => {
    const { name, keywords } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Topic name is required' });
    }

    try {
      const topic = await prisma.topic.create({
        data: {
          name,
          keywords: Array.isArray(keywords) ? keywords.join(', ') : (keywords || ''),
          userId: req.user.id
        }
      });
      res.json({
        id: topic.id,
        name: topic.name,
        keywords: topic.keywords.split(',').map(k => k.trim())
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route to get post history
  app.get('/api/posts', authenticateToken, async (req: any, res) => {
    try {
      const posts = await prisma.post.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        include: { schedule: true },
        take: 50
      });

      const fanpages = await prisma.fanpage.findMany({ where: { userId: req.user.id } });
      const fanpageMap = new Map(fanpages.map(f => [f.pageId, f.name]));

      const postsWithFanpage = posts.map(p => ({
        ...p,
        fanpageName: p.fanpageId ? fanpageMap.get(p.fanpageId) || 'Unknown Fanpage' : 'Unknown Fanpage'
      }));

      res.json(postsWithFanpage);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route to update a queued post
  app.put('/api/posts/:id', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    const { content, imageUrl } = req.body;
    console.log(`[PUT] /api/posts/${id} - Received payload size: ${req.get('content-length')} bytes`);
    
    try {
      const post = await prisma.post.findUnique({ where: { id } });
      if (!post || post.userId !== req.user.id) {
        return res.status(404).json({ error: 'Post not found or unauthorized' });
      }
      if (post.status !== 'queued') {
        return res.status(400).json({ error: 'Only queued posts can be edited' });
      }

      const updatedPost = await prisma.post.update({
        where: { id },
        data: {
          content,
          imageUrl: imageUrl !== undefined ? imageUrl : post.imageUrl
        }
      });
      res.json({ success: true, post: updatedPost });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route to fetch queued posts for a schedule
  app.get('/api/schedules/:id/posts', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    try {
      const posts = await prisma.post.findMany({
        where: { scheduleId: id, status: 'queued', userId: req.user.id },
        orderBy: { orderIndex: 'asc' }
      });
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route to reorder posts
  app.post('/api/posts/reorder', authenticateToken, async (req: any, res) => {
    const { postIds } = req.body; // Array of post IDs in NEW order
    if (!Array.isArray(postIds)) return res.status(400).json({ error: 'Post IDs array required' });

    try {
      // Use transaction to ensure consistency
      const updates = postIds.map((postId, index) =>
        prisma.post.update({
          where: { id: postId, userId: req.user.id },
          data: { orderIndex: index }
        })
      );
      await prisma.$transaction(updates);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route to get fanpages from database
  app.get('/api/fanpages', authenticateToken, async (req: any, res) => {
    try {
      const fanpages = await prisma.fanpage.findMany({ where: { userId: req.user.id } });
      res.json(fanpages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route to get schedules
  app.get('/api/schedules', authenticateToken, async (req: any, res) => {
    try {
      const schedules = await prisma.schedule.findMany({
        where: { userId: req.user.id },
        include: { fanpage: true }
      });
      res.json(schedules.map(s => ({
        id: s.id,
        topic: s.topic,
        fanpageId: s.fanpageId,
        fanpageName: s.fanpage.name,
        time: s.time,
        advancedPrompt: s.advancedPrompt,
        runCount: s.runCount,
        status: s.status
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route to create a schedule
  app.post('/api/schedules', authenticateToken, async (req: any, res) => {
    const { topic, fanpageId, time, advancedPrompt, runCount } = req.body;

    if (!topic || !fanpageId || !time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const fanpage = await prisma.fanpage.findFirst({ where: { pageId: fanpageId, userId: req.user.id } });
      if (!fanpage) {
        return res.status(404).json({ error: 'Fanpage not found in database or unauthorized' });
      }

      const newSchedule = await prisma.schedule.create({
        data: {
          topic,
          time,
          advancedPrompt,
          runCount: parseInt(runCount) || 1,
          status: 'active',
          fanpageId,
          userId: req.user.id
        },
        include: { fanpage: true }
      });

      scheduleJob(newSchedule);

      res.json({
        success: true, schedule: {
          id: newSchedule.id,
          topic: newSchedule.topic,
          fanpageId: newSchedule.fanpageId,
          fanpageName: newSchedule.fanpage.name,
          time: newSchedule.time,
          advancedPrompt: newSchedule.advancedPrompt,
          runCount: newSchedule.runCount,
          status: newSchedule.status
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route to delete a schedule
  app.delete('/api/schedules/:id', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const schedule = await prisma.schedule.findUnique({ where: { id } });
      if (!schedule || schedule.userId !== req.user.id) {
        return res.status(404).json({ error: 'Schedule not found or unauthorized' });
      }
      // Delete only non-published posts (queued, failed, etc.)
      await prisma.post.deleteMany({ 
        where: { 
          scheduleId: id, 
          status: { not: 'published' } 
        } 
      });
      
      // Clear the scheduleId link for published posts so they stay in general history
      await prisma.post.updateMany({
        where: { scheduleId: id, status: 'published' },
        data: { scheduleId: null }
      });

      // Now delete the schedule itself
      await prisma.schedule.delete({ where: { id } });

      const job = activeCronJobs.get(id);
      if (job) {
        job.stop();
        activeCronJobs.delete(id);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- MEDIA ACCESS API ---
  app.get('/api/media/:filename', (req, res) => {
    const { filename } = req.params;
    
    // [SECURITY] Prevent Path Traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(403).json({ error: 'Security violation detected' });
    }
    
    const filePath = path.join(__dirname, 'public', 'uploads', filename);

    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = __dirname; // Since server.cjs is in dist/
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
