import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as scheduleService from '../services/schedule.service.js';

const router = Router();

router.get('/', authenticateToken, async (req: any, res) => {
    try {
      const schedules = await scheduleService.listSchedules(req.user.id);
      res.json(schedules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.post('/', authenticateToken, async (req: any, res) => {
    try {
      const schedule = await scheduleService.createSchedule(req.user.id, req.body);
      res.json({ success: true, schedule });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.get('/:id/posts', authenticateToken, async (req: any, res) => {
    try {
      const posts = await scheduleService.getSchedulePosts(req.user.id, req.params.id);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.patch('/:id/status', authenticateToken, async (req: any, res) => {
    try {
      const schedule = await scheduleService.updateScheduleStatus(req.user.id, req.params.id, req.body.status);
      res.json(schedule);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', authenticateToken, async (req: any, res) => {
    try {
      await scheduleService.deleteSchedule(req.user.id, req.params.id);
      res.json({ message: 'Schedule deleted' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

export default router;
