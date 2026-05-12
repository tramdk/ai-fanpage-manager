import { prisma } from '../config/prisma.js';
import { scheduleJob, activeCronJobs, catchupScheduleIfMissed } from './cron.service.js';

export async function listSchedules(userId: string) {
    const schedules = await prisma.schedule.findMany({
        where: { userId },
        include: { 
          fanpage: { select: { name: true } },
          _count: {
            select: { posts: { where: { status: 'queued' } } }
          }
        }
    });

    // Flatten the _count to a simpler property if desired, or just use it as is.
    return schedules.map(s => ({
      ...s,
      queuedCount: s._count.posts,
      fanpageName: s.fanpage.name
    }));
}

export async function createSchedule(userId: string, data: any) {
    const { topic, time, advancedPrompt, runCount, fanpageId, workflowId } = data;
    
    const schedule = await prisma.schedule.create({
        data: {
          topic,
          time,
          advancedPrompt,
          runCount: parseInt(runCount?.toString() || '1'),
          fanpageId,
          workflowId,
          userId,
          status: 'active'
        },
        include: { fanpage: true, workflow: true }
    });

    scheduleJob(schedule);
    await catchupScheduleIfMissed(schedule);
    return schedule;
}

export async function updateSchedule(userId: string, id: string, data: any) {
    const { topic, time, advancedPrompt, runCount, fanpageId, workflowId, status } = data;
    
    const schedule = await prisma.schedule.update({
        where: { id, userId },
        data: {
          topic,
          time,
          advancedPrompt,
          runCount: runCount !== undefined ? parseInt(runCount.toString()) : undefined,
          fanpageId,
          workflowId,
          status: status || 'active'
        },
        include: { fanpage: true, workflow: true }
    });

    if (schedule.status === 'active') {
        scheduleJob(schedule);
        await catchupScheduleIfMissed(schedule);
    }
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
        await catchupScheduleIfMissed(schedule);
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
