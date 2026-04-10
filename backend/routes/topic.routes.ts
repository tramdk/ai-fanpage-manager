import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as topicService from '../services/topic.service.js';

const router = Router();

router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const topics = await topicService.listTopics(req.user.id);
    res.json(topics.map(t => ({ id: t.id, name: t.name, keywords: t.keywords.split(',').map(k => k.trim()) })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req: any, res) => {
  const { name, keywords } = req.body;
  if (!name) return res.status(400).json({ error: 'Topic name required' });
  try {
    const rawKeywords = Array.isArray(keywords) ? keywords.join(', ') : (keywords || '');
    const topic = await topicService.createTopic(req.user.id, { name, keywords: rawKeywords });
    res.json({ id: topic.id, name: topic.name, keywords: topic.keywords.split(',').map(k => k.trim()) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req: any, res) => {
  try {
    await topicService.deleteTopic(req.user.id, req.params.id);
    res.json({ success: true, message: 'Topic deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
