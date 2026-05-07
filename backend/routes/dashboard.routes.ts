import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { dashboardService } from '../services/dashboard.service.js';

const router = Router();

router.get('/', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const period = (req.query.period as string) || 'week'; // 'week' or 'month'
      
      const data = await dashboardService.getOverview(userId, period as 'week' | 'month');
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

export default router;
