import { prisma } from '../config/prisma.js';
import { encrypt, decrypt } from '../utils/encryption.js';

export async function listApps(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  let apps = await prisma.facebookApp.findMany({ where: { userId } });

  // Migrate legacy credentials if no apps exist
  if (apps.length === 0 && user.facebookAppId && user.facebookAppId.length > 5) {
    try {
      const migrated = await prisma.facebookApp.create({
        data: { appId: user.facebookAppId, appSecret: user.facebookAppSecret || '', name: 'Primary App (Legacy)', userId }
      });
      apps = [migrated];
    } catch (e) {
      console.error('[FBAPP] Legacy migration failed:', e);
    }
  }

  return apps.map(app => ({
    id: app.id,
    appId: decrypt(app.appId, user.email),
    name: app.name || 'Unnamed App',
    createdAt: app.createdAt
  }));
}

export async function createApp(userId: string, appId: string, appSecret: string, name?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const newApp = await prisma.facebookApp.create({
    data: { appId: encrypt(appId, user.email), appSecret: encrypt(appSecret, user.email), name: name || 'New App', userId }
  });
  return { id: newApp.id, message: 'App added' };
}

export async function deleteApp(userId: string, id: string) {
  return prisma.facebookApp.delete({ where: { id, userId } });
}
