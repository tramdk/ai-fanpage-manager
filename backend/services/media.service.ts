import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { prisma } from '../config/prisma.js';

const __filename = typeof import.meta.url !== 'undefined' ? fileURLToPath(import.meta.url) : '';
const __dirname = __filename ? path.dirname(__filename) : process.cwd();
const UPLOADS_DIR = path.resolve(__dirname, __filename ? '../../public/uploads' : 'public/uploads');

// Ensure directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function calculateHash(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

export async function uploadToCloudinary(filePath: string, folder: string = 'fanpage-manager') {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'auto'
    });
    return result.secure_url;
  } catch (error: any) {
    console.error('[Media] Cloudinary Upload Error:', error.message);
    return null;
  }
}

export async function handleFileUpload(file: any, userId?: string) {
  const hash = calculateHash(file.buffer);

  // 1. Check if file with same hash already exists in DB
  const existing = await prisma.media.findUnique({
    where: { hash }
  });

  if (existing) {
    console.log(`[Media] Duplicate detected for hash ${hash}. Returning existing URL: ${existing.url}`);
    return {
      id: existing.id,
      fileName: existing.name,
      cloudUrl: existing.url,
      isDuplicate: true
    };
  }

  // 2. If not existing, process new upload
  const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
  const localPath = path.join(UPLOADS_DIR, fileName);

  // Save locally
  fs.writeFileSync(localPath, file.buffer);

  // Upload to Cloudinary for public URL
  const cloudUrl = await uploadToCloudinary(localPath);
  const finalUrl = cloudUrl || `/api/media/${fileName}`;

  // 3. Save to Database
  const saved = await prisma.media.create({
    data: {
      name: file.originalname,
      url: finalUrl,
      hash: hash,
      size: file.size,
      type: file.mimetype,
      userId: userId
    }
  });
  
  return {
    id: saved.id,
    fileName: fileName,
    cloudUrl: finalUrl,
    isDuplicate: false
  };
}

export async function listLocalFiles(userId?: string) {
  // Try to list from DB first
  const dbFiles = await prisma.media.findMany({
    where: userId ? { userId } : {},
    orderBy: { createdAt: 'desc' }
  });

  if (dbFiles.length > 0) {
    return dbFiles.map(f => ({
      name: f.name,
      url: f.url,
      mtime: f.createdAt
    }));
  }

  // Fallback to local files if DB is empty
  if (fs.existsSync(UPLOADS_DIR)) {
    return fs.readdirSync(UPLOADS_DIR)
      .filter(file => /\.(jpg|jpeg|png|gif|mp4|webm)$/i.test(file))
      .map(file => ({
        name: file,
        url: `/api/media/${file}`,
        mtime: fs.statSync(path.join(UPLOADS_DIR, file)).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  }
  return [];
}
