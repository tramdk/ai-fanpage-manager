import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as aiService from '../services/ai.service.js';
import * as autoreelsService from '../services/autoreels.service.js';
import { publishVideoUrl } from '../services/fanpage.service.js';
import { prisma } from '../config/prisma.js';

const router = Router();

router.post('/publish-video', authenticateToken, async (req: any, res) => {
  const { videoUrl, fanpageId, content } = req.body;
  if (!videoUrl || !fanpageId) return res.status(400).json({ error: 'Video URL and Fanpage ID are required' });

  try {
    const result = await publishVideoUrl(req.user.id, fanpageId, videoUrl, content);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/video-options', authenticateToken, async (req: any, res) => {
  try {
    const options = await autoreelsService.getAutoReelsOptions();
    res.json(options);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/video-status/:videoId', authenticateToken, async (req: any, res) => {
  try {
    const status = await autoreelsService.getVideoStatus(req.params.videoId);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/video-status-batch', authenticateToken, async (req: any, res) => {
  try {
    const { videoIds } = req.body;
    if (!videoIds || !Array.isArray(videoIds)) return res.status(400).json({ error: 'videoIds array required' });
    const statuses = await autoreelsService.getVideoStatusBatch(videoIds);
    res.json(statuses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/video-queue', authenticateToken, async (req: any, res) => {
  try {
    const queue = await prisma.videoQueue.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(queue);
  } catch (error: any) {
    console.error('❌ [BACKEND ERROR] /api/ai/video-queue:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-video', authenticateToken, async (req: any, res) => {
  const { postId, templateId, ttsProvider, ttsVoiceId, bgmAssetId } = req.body;
  if (!postId) return res.status(400).json({ error: 'Post ID is required' });

  try {
    const result = await autoreelsService.generateVideoFromPost(postId, {
      templateId,
      ttsProvider,
      ttsVoiceId,
      bgmAssetId
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

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
