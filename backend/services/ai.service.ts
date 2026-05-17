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
      throw new Error('GOOGLE_API_EMPTY_RESPONSE: Gemini returned an empty response. It might have been blocked due to safety settings.');
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
 * Internal helper to fetch image buffer and retrieve its content-type headers
 */
async function fetchImageAndMimeType(url: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const mimeType = res.headers.get('content-type') || 'image/jpeg';
    return { buffer, mimeType };
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

/**
 * Generate Product Advertisement from Product Image
 * Reuses same Gemini 2.0 Flash model but utilizes multimodal vision capabilities.
 */
export async function generateProductAd(params: {
  imageUrl: string;
  productName?: string;
  tone?: string;
  targetAudience?: string;
  instructions?: string;
  postType?: string;
  language?: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY_MISSING: Gemini API Key is not configured in .env file.');
  }

  const { imageUrl, productName, tone, targetAudience, instructions, postType, language } = params;

  let buffer: Buffer | null = null;
  let mimeType = 'image/jpeg';

  // 1. Check if the image url is local
  if (imageUrl.startsWith('/api/media/')) {
    const filename = imageUrl.replace('/api/media/', '');
    const filePath = path.join(PROJECT_ROOT, 'public', 'uploads', filename);
    if (fs.existsSync(filePath)) {
      buffer = fs.readFileSync(filePath);
      const ext = path.extname(filename).toLowerCase();
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.gif') mimeType = 'image/gif';
      else if (ext === '.jpeg' || ext === '.jpg') mimeType = 'image/jpeg';
    }
  }

  // 2. Fetch remote or fallback URL
  if (!buffer) {
    let absoluteUrl = imageUrl;
    if (imageUrl.startsWith('/')) {
      const port = process.env.PORT || '5000';
      absoluteUrl = `http://localhost:${port}${imageUrl}`;
    }
    
    const fetchResult = await fetchImageAndMimeType(absoluteUrl);
    if (fetchResult) {
      buffer = fetchResult.buffer;
      mimeType = fetchResult.mimeType;
    }
  }

  if (!buffer) {
    throw new Error('IMAGE_RESOLUTION_FAILED: Could not retrieve image content from the provided URL.');
  }

  // 3. Construct premium prompt for product analysis and advertisement generation
  let prompt = `Bạn là một chuyên gia Marketing, Copywriter và Nhà sáng tạo nội dung hàng đầu.
Tôi sẽ cung cấp cho bạn một hình ảnh của sản phẩm. Nhiệm vụ của bạn là phân tích hình ảnh này thật kỹ (về thiết kế, màu sắc, kiểu dáng, chất liệu, tính năng nổi bật được mô tả trên bao bì nếu có) và viết một bài đăng quảng cáo chất lượng cao, có khả năng chuyển đổi và thu hút khách hàng cực mạnh.

`;

  if (productName) {
    prompt += `Tên sản phẩm/Thương hiệu: "${productName}"\n`;
  }

  if (tone) {
    prompt += `Tông giọng truyền tải: ${tone}\n`;
  }

  if (targetAudience) {
    prompt += `Khách hàng mục tiêu: ${targetAudience}\n`;
  }

  if (instructions) {
    prompt += `Yêu cầu đặc biệt: ${instructions}\n`;
  }

  const lang = language || 'Tiếng Việt';
  prompt += `Ngôn ngữ viết bài: ${lang}\n`;

  // Apply post-type structures
  if (postType === 'facebook_ad') {
    prompt += `Định dạng bài viết: Bài đăng Facebook Ads / Bán hàng trực tiếp.
Yêu cầu cấu trúc:
1. Tiêu đề (Hook) cực ngắn gọn, khơi gợi nhu cầu đột ngột (kèm emoji phù hợp).
2. Nỗi đau / Nhu cầu khách hàng mà sản phẩm này sẽ giải quyết một cách hoàn hảo.
3. Liệt kê các lợi ích nổi bật và lý do khách hàng nên sở hữu ngay sản phẩm có trong hình.
4. Kêu gọi hành động (CTA) cực mạnh để khách nhắn tin/mua ngay.
5. 3-5 Hashtag thịnh hành.`;
  } else if (postType === 'product_review') {
    prompt += `Định dạng bài viết: Đánh giá (Review) sản phẩm chân thực, khách quan nhưng cực kỳ cuốn hút.
Yêu cầu cấu trúc:
1. Lời dẫn thu hút nói về ấn tượng đầu tiên khi nhìn thấy sản phẩm này.
2. Trải nghiệm thực tế giả định (cảm nhận chất liệu, hiệu năng, sự tiện dụng...).
3. Đánh giá ưu điểm lớn nhất thu hút bạn từ sản phẩm này.
4. Lời khuyên ai nên sở hữu sản phẩm này.
5. Hashtag liên quan.`;
  } else if (postType === 'storytelling') {
    prompt += `Định dạng bài viết: Storytelling (Kể chuyện thương hiệu/Khách hàng đầy cảm xúc).
Yêu cầu cấu trúc:
1. Dẫn dắt bằng một câu chuyện ngắn đầy cảm xúc hoặc một tình huống đời sống liên quan đến vấn đề sản phẩm giải quyết.
2. Sản phẩm xuất hiện như một "vị cứu tinh" giúp giải quyết triệt để vấn đề đó.
3. Thông điệp ý nghĩa rút ra từ câu chuyện.
4. Kêu gọi chia sẻ cảm nhận và Hashtag.`;
  } else if (postType === 'tiktok_script') {
    prompt += `Định dạng bài viết: Kịch bản video ngắn (TikTok/Reels/Shorts) có tỷ lệ giữ chân người xem cao.
Yêu cầu cấu trúc:
- Giây 0-3 (Hook): Hành động/lời thoại giật gân để giữ người dùng không lướt qua.
- Giây 3-15 (Body): Chỉ ra vấn đề và biểu diễn sản phẩm có trong hình (Show, don't tell).
- Giây 15-30 (Call to Action): Hướng dẫn người xem click giỏ hàng/link bio.
- Gợi ý hiệu ứng âm thanh/chuyển cảnh trực quan.`;
  } else {
    prompt += `Định dạng bài viết: Bài đăng quảng cáo sản phẩm thông thường thu hút, đầy đủ thông tin sản phẩm và kêu gọi mua hàng.`;
  }

  prompt += `\n\nLưu ý quan trọng:
- Trả về DUY NHẤT nội dung bài đăng/kịch bản quảng cáo, không thêm lời chào, lời giải thích hay bất kỳ ký tự thừa nào ngoài văn bản quảng bá sản phẩm.
- Văn phong tự nhiên, mạch lạc, dễ đọc trên di động (ngắt dòng hợp lý).
- Sử dụng emoji sinh động nhưng không quá lạm dụng.`;

  try {
    const genAI = new GoogleGenAI({ apiKey });
    const base64Data = buffer.toString('base64');
    
    const result = await genAI.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        prompt
      ]
    });
    
    const text = result.text;
    
    if (!text) {
      throw new Error('GOOGLE_API_EMPTY_RESPONSE: Gemini returned an empty response. It might have been blocked due to safety settings.');
    }

    return cleanAIResult(text);
  } catch (error: any) {
    const errorMessage = error.message || '';
    if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota')) {
      throw new Error('GOOGLE_API_QUOTA_EXCEEDED: You have reached the rate limit for Gemini. Please wait a moment.');
    }
    throw new Error(`GOOGLE_API_ERROR: ${errorMessage}`);
  }
}
