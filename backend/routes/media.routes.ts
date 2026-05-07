import { Router } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import * as mediaService from '../services/media.service.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload a single file
router.post('/upload', authenticateToken, upload.single('file'), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const result = await mediaService.handleFileUpload(req.file, req.user?.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List all files
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const files = await mediaService.listLocalFiles(req.user?.id);
    res.json(files);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
