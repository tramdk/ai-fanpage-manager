import { GoogleGenAI } from '@google/genai';
import { uploadBufferToCloudinary } from '../config/cloudinary.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

// Use the model name WITHOUT 'models/' prefix — the @google/genai v1 SDK requires it
const DEFAULT_MODEL = 'gemini-2.0-flash';

export function cleanAIResult(text: string) {
  if (!text) return '';
  let cleaned = text.trim();
  
  // Remove markdown code blocks
  if (cleaned.startsWith('```')) {
    const lines = cleaned.split('\n');
    cleaned = lines.slice(1, lines.length - 1).join('\n').trim();
  }

  // Remove common AI conversational prefixes
  const patterns = [
    /^Sure, here (is|are) [^:]+:\s*/i,
    /^Here is (the|a) [^:]+:\s*/i,
    /^Certainly! Here [^:]+:\s*/i,
    /^Sẵn lòng, đây là/i,
    /^Đây là nội dung/i,
    /^Dưới đây là/i
  ];

  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '').trim();
  }

  return cleaned.replace(/```/g, '').trim();
}

/**
 * Text Generation Service
 */
export async function generateText(prompt: string) {
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const result = await genAI.models.generateContent({ model: DEFAULT_MODEL, contents: prompt });
  return cleanAIResult(result.text || '');
}

/**
 * Image Generation Service with Multi-stage Fallback
 */
export async function generateImage(topic: string, userPrompt?: string) {
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  // PHASE 1: Refine prompt with Gemini
  const refinementPrompt = `Refine this concept for a high-quality AI image generator (Flux/SDXL). 
  Topic: ${topic || userPrompt}. 
  Return ONLY a detailed English prompt describing the scene, lighting, and style. No intro.`;
  
  const kResult = await genAI.models.generateContent({ model: DEFAULT_MODEL, contents: refinementPrompt });
  const refinedPrompt = kResult.text?.trim() || userPrompt || topic;
  const keyword = encodeURIComponent((topic || userPrompt || 'flower').substring(0, 50));

  // PHASE 2: Try Pollinations (download + persist)
  const seed = Math.floor(Math.random() * 9999999);
  const aiGenUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(refinedPrompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
  
  try {
    console.log('[AI-IMAGE] Trying Pollinations...');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const imageRes = await fetch(aiGenUrl, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!imageRes.ok) throw new Error(`Pollinations status ${imageRes.status}`);
    const buffer = Buffer.from(await imageRes.arrayBuffer());
    console.log('[AI-IMAGE] Pollinations OK, persisting...');

    // PHASE 3: Persist to Cloudinary or local disk
    try {
      return await uploadBufferToCloudinary(buffer);
    } catch {
      const filename = `ai-${Date.now()}.jpg`;
      const uploadDir = path.join(PROJECT_ROOT, 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, filename), buffer);
      return `/api/media/${filename}`;
    }
  } catch (err: any) {
    console.warn(`[AI-IMAGE] Pollinations failed (${err.message}). Using direct URL fallback.`);
  }

  // PHASE 2 Fallback A: Unsplash direct URL (no download needed)
  if (process.env.UNSPLASH_ACCESS_KEY) {
    try {
      const uRes = await fetch(`https://api.unsplash.com/photos/random?query=${keyword}&orientation=landscape`, {
        headers: { 'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
        signal: AbortSignal.timeout(5000)
      });
      const uData = await uRes.json();
      if (uData.urls?.regular) {
        console.log('[AI-IMAGE] Unsplash fallback OK');
        return uData.urls.regular; // Return URL directly — no download
      }
    } catch (e) {
      console.warn('[AI-IMAGE] Unsplash failed, trying Picsum...');
    }
  }

  // PHASE 2 Fallback B: Picsum (reliable, fast, no API key)
  const picsumUrl = `https://picsum.photos/seed/${seed}/1024/1024`;
  console.log('[AI-IMAGE] Using Picsum fallback:', picsumUrl);
  return picsumUrl; // Return URL directly — guaranteed to work
}
