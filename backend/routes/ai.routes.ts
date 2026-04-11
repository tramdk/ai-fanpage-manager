import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as aiService from '../services/ai.service.js';

const router = Router();

router.post('/generate-text', authenticateToken, async (req: any, res) => {
  const { prompt: directPrompt, topic, instructions, tone, language } = req.body;

  let finalPrompt = directPrompt;
  if (!finalPrompt && topic) {
    finalPrompt = `Create a high-quality Facebook post about: ${topic}.
      Tone: ${tone || 'Professional, engaging, and persuasive'}.
      Language: ${language || 'Vietnamese'}.
      Instructions: ${instructions || 'No specific instructions.'}
      Only return the body content of the post. No hashtags unless specified.`;
  }

  if (!finalPrompt) return res.status(400).json({ error: 'Topic or Prompt is required' });

  try {
    const text = await aiService.generateText(finalPrompt);
    res.json({ text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-image', authenticateToken, async (req: any, res) => {
  const { prompt, topic, keywords } = req.body;
  if (!prompt && !topic) return res.status(400).json({ error: 'Prompt or Topic required' });

  try {
    const imageUrl = await aiService.generateImage(topic, prompt, keywords);
    res.json({ imageUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
