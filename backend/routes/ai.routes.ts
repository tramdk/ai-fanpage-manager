import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '../config/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { cleanAIResult, getStableModel } from '../services/ai.service.js';
import { uploadBufferToCloudinary } from '../config/cloudinary.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

router.post('/generate-text', authenticateToken, async (req: any, res) => {
    const { topic, instructions, fanpageId } = req.body;
    if (!topic) return res.status(400).json({ error: 'Topic is required' });

    try {
      const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY || '');
      const model = await getStableModel(genAI);

      const prompt = `Create a high-quality Facebook post about: ${topic}.
      Target Audience: Vietnamese customers interested in floral products.
      Tone: Professional, elegant, and persuasive.
      Instructions: ${instructions || 'No specific instructions.'}
      Only return the body content of the post. No intro, no hashtags unless specified.`;

      const result = await model.generateContent(prompt);
      const content = cleanAIResult(result.response.text());

      res.json({ content });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.post('/generate-image', authenticateToken, async (req: any, res) => {
    const { prompt, topic } = req.body;
    try {
      // 1. Get Keywords for searching/generating
      const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY || '');
      const kModel = await getStableModel(genAI);
      const kPrompt = `From the topic "${topic || prompt}", extract 2-3 English keywords for high-quality professional photography search. Return ONLY keywords separated by commas.`;
      const kResult = await kModel.generateContent(kPrompt);
      const keywords = cleanAIResult(kResult.response.text());

      // 2. Try Gemini Image Generation
      try {
        const iModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const imgPrompt = `Professional high-quality commercial photography of: ${keywords}. 8k, bokeh, elegant lighting.`;
        
        // Note: Direct image generation via flash might not be supported yet on all keys 
        // We use the buffer if it was a real image gen, but here we'll use Unsplash as the main reliable source for now
        // since Gemini 1.5 doesn't natively return image bytes in the standard chat response yet.
        throw new Error('Fallback to Unsplash');
      } catch (e) {
        // Unsplash Search
        const searchRes = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(keywords)}&orientation=landscape`, {
          headers: { 'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY || 'your-unsplash-key'}` }
        });
        const data = await searchRes.json();
        const imageUrl = data.urls?.regular || `https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&q=80&w=1000`;
        
        // NEW: Try to persist the image to Cloudinary for stability
        try {
           const imgFetch = await fetch(imageUrl);
           const buffer = Buffer.from(await imgFetch.arrayBuffer());
           const cloudinaryUrl = await uploadBufferToCloudinary(buffer);
           return res.json({ imageUrl: cloudinaryUrl });
        } catch (clErr) {
           // Fallback to local save if Cloudinary is not configured or fails
           const filename = `ai-${Date.now()}.jpg`;
           const uploadDir = path.join(PROJECT_ROOT, 'public', 'uploads');
           if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
           
           const imgFetch = await fetch(imageUrl);
           const buffer = Buffer.from(await imgFetch.arrayBuffer());
           fs.writeFileSync(path.join(uploadDir, filename), buffer);
           
           return res.json({ imageUrl: `/api/media/${filename}` });
        }
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

export default router;
