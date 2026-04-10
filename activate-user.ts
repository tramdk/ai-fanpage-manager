import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.user.updateMany({
    where: { email: 'tramdk1997@gmail.com' },
    data: { isActive: true }
  });
  console.log('User activated');
}
main().catch(console.error).finally(() => prisma.$disconnect());
