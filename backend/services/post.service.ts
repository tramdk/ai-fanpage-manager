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

export async function updatePost(userId: string, id: string, data: any) {
    const { content, imageUrl, status, topic, fbPostId } = data;
    const updateData: any = {};
    if (content !== undefined) updateData.content = content;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (status !== undefined) updateData.status = status;
    if (topic !== undefined) updateData.topic = topic;
    if (fbPostId !== undefined) updateData.fbPostId = fbPostId;

    return prisma.post.update({
        where: { id, userId },
        data: updateData
    });
}

export async function queuePost(userId: string, data: any) {
    const { topic, content, imageUrl, fanpageId, scheduleId, orderIndex, fbPostId } = data;
    return prisma.post.create({
        data: {
          topic,
          content,
          imageUrl,
          fanpageId,
          scheduleId,
          orderIndex: orderIndex !== undefined ? parseInt(orderIndex.toString()) : 0,
          fbPostId,
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
