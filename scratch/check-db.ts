
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSchedules() {
  try {
    const schedules = await prisma.schedule.findMany({
      include: {
        _count: {
          select: { posts: { where: { status: 'queued' } } }
        }
      }
    });
    console.log('Schedules:', JSON.stringify(schedules, null, 2));

    const activeJobs = await prisma.schedule.findMany({
      where: { status: 'active' }
    });
    console.log(`Found ${activeJobs.length} active schedules.`);

    const queuedPosts = await prisma.post.findMany({
      where: { status: 'queued' },
      take: 5
    });
    console.log('Sample Queued Posts:', JSON.stringify(queuedPosts, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchedules();
