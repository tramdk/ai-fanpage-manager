import { GoogleGenAI } from '@google/genai';
import { uploadBufferToCloudinary } from '../config/cloudinary.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = typeof import.meta.url !== 'undefined' ? fileURLToPath(import.meta.url) : '';
const __dirname = __filename ? path.dirname(__filename) : process.cwd();
const PROJECT_ROOT = path.resolve(__dirname, __filename ? '../../' : './');

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
 * Text Generation Service with Detailed Error Handling
 */
export async function generateText(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY || '';
  
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY_MISSING: Gemini API Key is not configured in .env file.');
  }

  try {
    const genAI = new GoogleGenAI({ apiKey });
    
    // Usage for the specific @google/genai package
    const result = await genAI.models.generateContent({ 
      model: DEFAULT_MODEL, 
      contents: prompt 
    });
    
    const text = result.text;
    
    if (!text) {
      // Check if blocked by safety (some SDKs return empty text when blocked)
      if (result.status === 'blocked') {
        throw new Error('GOOGLE_API_SAFETY_BLOCK: Content was blocked due to safety settings.');
      }
      throw new Error('GOOGLE_API_EMPTY_RESPONSE: Gemini returned an empty response.');
    }

    return cleanAIResult(text);
  } catch (error: any) {
    // Categorize and provide detailed messages for common Google API errors
    const errorMessage = error.message || '';
    
    if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota')) {
      throw new Error('GOOGLE_API_QUOTA_EXCEEDED: You have reached the rate limit for Gemini. Please wait a moment or upgrade your plan.');
    }
    
    if (errorMessage.includes('403') || errorMessage.toLowerCase().includes('permission')) {
      throw new Error('GOOGLE_API_PERMISSION_DENIED: Access denied. Check if your API key is valid and has Gemini API enabled.');
    }

    if (errorMessage.includes('400')) {
      throw new Error(`GOOGLE_API_BAD_REQUEST: Invalid request parameters. ${errorMessage}`);
    }

    if (errorMessage.includes('500') || errorMessage.includes('503')) {
      throw new Error('GOOGLE_API_SERVER_ERROR: Google AI servers are temporarily overloaded. Please try again in a few seconds.');
    }

    // Pass through other errors with a prefix
    throw new Error(`GOOGLE_API_ERROR: ${errorMessage}`);
  }
}

/**
 * Image Discovery Service (Cost-effective alternative to Generation)
 * Searches "vast internet resources" based on topic keywords.
 */
export async function generateImage(topic: string, userPrompt?: string, keywords?: string | string[]) {
  let searchTerms = '';

  // Priority 1: Use keywords if available (from Topic or Form)
  if (keywords && (Array.isArray(keywords) ? keywords.length > 0 : keywords.trim().length > 0)) {
    searchTerms = Array.isArray(keywords) ? keywords.join(' ') : keywords;
  } 
  // Priority 2: Fallback to Topic or User Prompt
  else {
    searchTerms = topic || userPrompt || 'nature';
  }

  const queryKeywords = searchTerms.substring(0, 150);
  const query = encodeURIComponent(queryKeywords);
  console.log(`[IMAGE-SEARCH] Searching for: ${queryKeywords}`);

  // 2. Try Unsplash (Primary Search)
  if (process.env.UNSPLASH_ACCESS_KEY) {
    try {
      const uRes = await fetch(`https://api.unsplash.com/search/photos?query=${query}&per_page=10&orientation=landscape`, {
        headers: { 'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` }
      });
      const data = await uRes.json();
      if (data.results?.length > 0) {
        const img = data.results[Math.floor(Math.random() * Math.min(data.results.length, 5))];
        const buffer = await fetchImageBuffer(img.urls.regular);
        if (buffer) return await persistImage(buffer);
      }
    } catch (e) {
      console.warn('[IMAGE-SEARCH] Unsplash API failed.');
    }
  }

  // 3. Try Pexels (Secondary Search)
  if (process.env.PEXELS_API_KEY) {
     try {
       const pRes = await fetch(`https://api.pexels.com/v1/search?query=${query}&per_page=5&orientation=landscape`, {
         headers: { 'Authorization': process.env.PEXELS_API_KEY }
       });
       const data = await pRes.json();
       if (data.photos?.length > 0) {
         const img = data.photos[0];
         const buffer = await fetchImageBuffer(img.src.large2x || img.src.large);
         if (buffer) return await persistImage(buffer);
       }
     } catch (e) {
       console.warn('[IMAGE-SEARCH] Pexels API failed.');
     }
  }

  // 4. Reliable Free Search/Discovery (LoremFlickr - searches multiple sources)
  try {
    const searchUrl = `https://loremflickr.com/1200/800/${query.replace(/ /g, ',')}/all`;
    const buffer = await fetchImageBuffer(searchUrl);
    if (buffer) return await persistImage(buffer);
  } catch (err) {
    console.warn('[IMAGE-SEARCH] LoremFlickr failed.');
  }

  // Final Fallback: Random but reliable
  const seed = Math.floor(Math.random() * 999999);
  return `https://picsum.photos/seed/${seed}/1200/800`;
}

/**
 * Internal helper to fetch image buffer
 */
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Internal helper to persist image to Cloudinary or Local
 */
async function persistImage(buffer: Buffer): Promise<string> {
  try {
    // Try Cloudinary if configured
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      return await uploadBufferToCloudinary(buffer);
    }
  } catch (e) {
    console.warn('[IMAGE-PERSIST] Cloudinary failed, using local.');
  }

  // Fallback to local storage
  const filename = `img-${Date.now()}.jpg`;
  const uploadDir = path.join(PROJECT_ROOT, 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  return `/api/media/${filename}`;
}
