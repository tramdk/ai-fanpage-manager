import { prisma } from '../config/prisma.js';

export async function getPostHistory(userId: string) {
    const posts = await prisma.post.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { schedule: { select: { topic: true } } },
        take: 50
    });

    const fanpages = await prisma.fanpage.findMany({ where: { userId } });
    const fanpageMap = new Map(fanpages.map(f => [f.pageId, f.name]));

    return posts.map(p => ({
        ...p,
        fanpageName: p.fanpageId ? fanpageMap.get(p.fanpageId) || 'Unknown Fanpage' : 'System Generated'
    }));
}

export async function clearScheduleQueue(userId: string, scheduleId: string) {
    const result = await prisma.post.deleteMany({
        where: { scheduleId, userId, status: { in: ['queued', 'failed'] } }
    });
    return { deleted: result.count };
}

export async function updatePost(userId: string, id: string, data: { content?: string, imageUrl?: string, status?: string }) {
    return prisma.post.update({
        where: { id, userId },
        data
    });
}

export async function queuePost(userId: string, data: any) {
    return prisma.post.create({
        data: {
          ...data,
          userId,
          status: 'queued'
        }
    });
}

export async function reorderPosts(userId: string, postIds: string[]) {
    const updates = postIds.map((id, index) => 
        prisma.post.update({
            where: { id, userId },
            data: { orderIndex: index }
        })
    );
    return Promise.all(updates);
}

export async function deletePost(userId: string, id: string) {
    return prisma.post.delete({ where: { id, userId } });
}
