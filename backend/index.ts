import app from './app.js';
import { prisma } from './config/prisma.js';
import { scheduleJob } from './services/cron.service.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../');

async function startServer() {
  const PORT = process.env.PORT || 3000;

  // 1. Root Admin Check
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@floral.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await prisma.user.create({
        data: { email: adminEmail, password: hashedPassword, name: 'Root Admin', role: 'admin', isActive: true }
      });
      console.log(`[BOOT] Root admin created: ${adminEmail}`);
    }
  } catch (err) { console.error('[BOOT] Admin setup error:', err); }

  // 2. Load active schedules
  try {
    const existingSchedules = await prisma.schedule.findMany({ 
      where: { status: 'active' },
      include: { fanpage: true } 
    });
    console.log(`[BOOT] Loading ${existingSchedules.length} schedules...`);
    for (const schedule of existingSchedules) {
      scheduleJob(schedule);
    }
  } catch (err) { console.error('[BOOT] Schedule load error:', err); }

  // 3. Vite Integration (SSR for development, serve static in prod)
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Prod: serve built dist
    // app.use(express.static(path.resolve(PROJECT_ROOT, 'dist')));
    // (Actual prod deployment might use specialized static serving)
  }

  app.listen(PORT, () => {
    console.log(`[SERVER] Running at http://localhost:${PORT}`);
  });
}

startServer();
