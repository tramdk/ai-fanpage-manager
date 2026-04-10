import { prisma } from '../config/prisma.js';

export async function listTopics(userId: string) {
    return prisma.topic.findMany({ where: { userId } });
}

export async function createTopic(userId: string, data: { name: string, keywords: string }) {
    return prisma.topic.create({
        data: { ...data, userId }
    });
}

export async function deleteTopic(userId: string, id: string) {
    return prisma.topic.delete({ where: { id, userId } });
}
