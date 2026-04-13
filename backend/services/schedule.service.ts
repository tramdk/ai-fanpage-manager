import { prisma } from '../config/prisma.js';
import { scheduleJob, activeCronJobs } from './cron.service.js';

export async function listSchedules(userId: string) {
    return prisma.schedule.findMany({
        where: { userId },
        include: { fanpage: { select: { name: true } } }
    });
}

export async function createSchedule(userId: string, data: any) {
    const { topic, time, advancedPrompt, runCount, fanpageId } = data;
    
    const schedule = await prisma.schedule.create({
        data: {
          topic,
          time,
          advancedPrompt,
          runCount: parseInt(runCount?.toString() || '1'),
          fanpageId,
          userId,
          status: 'active'
        },
        include: { fanpage: true }
    });

    scheduleJob(schedule);
    return schedule;
}

export async function getSchedulePosts(userId: string, id: string) {
    return prisma.post.findMany({
        where: { scheduleId: id, userId },
        orderBy: { orderIndex: 'asc' }
    });
}

export async function updateScheduleStatus(userId: string, id: string, status: string) {
    const schedule = await prisma.schedule.update({
        where: { id, userId },
        data: { status },
        include: { fanpage: true }
    });

    if (status === 'active') {
        scheduleJob(schedule);
    } else {
        const job = activeCronJobs.get(id);
        if (job) { job.stop(); activeCronJobs.delete(id); }
    }
    return schedule;
}

export async function deleteSchedule(userId: string, id: string) {
    // 1. Stop the cron job immediately
    const job = activeCronJobs.get(id);
    if (job) { job.stop(); activeCronJobs.delete(id); }

    // 2. Hard-delete all posts that have NOT been published (queued, failed)
    await prisma.post.deleteMany({
        where: { scheduleId: id, userId, status: { in: ['queued', 'failed'] } }
    });

    // 3. Detach published posts — preserve them in Activity Logs, just unlink from schedule
    await prisma.post.updateMany({
        where: { scheduleId: id, userId, status: 'published' },
        data: { scheduleId: null }
    });

    // 4. Delete the schedule
    return prisma.schedule.delete({ where: { id, userId } });
}
