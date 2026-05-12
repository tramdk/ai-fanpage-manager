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
    finalPrompt = `Đóng vai một chuyên gia Marketing và Copywriter hàng đầu, hãy viết một bài đăng mạng xã hội chất lượng cao, mang tính viral và có tỷ lệ chuyển đổi cao về chủ đề: "${topic}".
      Tông giọng: ${tone || 'Chuyên nghiệp, thu hút và thuyết phục'}.
      Ngôn ngữ: ${language || 'Tiếng Việt'}.
      Yêu cầu đặc biệt: ${instructions || 'Không có'}
      
      Yêu cầu bài viết phải tuân thủ cấu trúc chuẩn Marketing sau:
      1. Tiêu đề (Hook): Giật tít, thu hút sự chú ý ngay trong 3 giây đầu tiên (sử dụng icon phù hợp).
      2. Nỗi đau / Vấn đề (Pain point): Chạm vào vấn đề mà khách hàng mục tiêu đang gặp phải.
      3. Giải pháp / Giá trị (Solution/Value): Đưa ra thông tin hữu ích hoặc giải quyết vấn đề một cách thuyết phục.
      4. Kêu gọi hành động (CTA): Khuyến khích tương tác (like, share, comment, tag bạn bè, hoặc click link) một cách tự nhiên.
      5. Hashtag: Thêm 3-5 hashtag liên quan và thịnh hành.

      Lưu ý quan trọng:
      - Văn phong tự nhiên, gần gũi, nắm bắt đúng Insight người dùng mạng xã hội.
      - Trình bày mạch lạc, ngắt đoạn ngắn gọn để dễ đọc trên thiết bị di động.
      - CHỈ trả về duy nhất nội dung bài đăng, KHÔNG kèm theo lời giải thích hay bất kỳ câu chào hỏi nào khác.`;
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
