import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { scheduleJob, activeCronJobs } from '../services/cron.service.js';

const router = Router();

router.get('/schedules', authenticateToken, async (req: any, res) => {
    try {
      const schedules = await prisma.schedule.findMany({
        where: { userId: req.user.id },
        include: { fanpage: { select: { name: true } } }
      });
      res.json(schedules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.post('/schedules', authenticateToken, async (req: any, res) => {
    const { topic, time, fanpageId, instructions, runCount } = req.body;
    if (!topic || !time || !fanpageId) return res.status(400).json({ error: 'Missing required fields' });

    try {
      const schedule = await prisma.schedule.create({
        data: {
          topic,
          time,
          fanpageId,
          instructions: instructions || 'Generate high quality content.',
          runCount: parseInt(runCount) || 1,
          status: 'active',
          userId: req.user.id
        },
        include: { fanpage: true }
      });

      scheduleJob(schedule);
      res.json(schedule);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.delete('/schedules/:id', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    try {
      const job = activeCronJobs.get(id);
      if (job) {
        job.stop();
        activeCronJobs.delete(id);
      }
      await prisma.schedule.delete({ where: { id, userId: req.user.id } });
      res.json({ message: 'Schedule deleted' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

router.patch('/schedules/:id/status', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      const schedule = await prisma.schedule.update({
        where: { id, userId: req.user.id },
        data: { status },
        include: { fanpage: true }
      });

      if (status === 'active') {
        scheduleJob(schedule);
      } else {
        const job = activeCronJobs.get(id);
        if (job) {
          job.stop();
          activeCronJobs.delete(id);
        }
      }
      res.json(schedule);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

export default router;
