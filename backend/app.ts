import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import facebookRoutes from './routes/facebook.routes.js';
import aiRoutes from './routes/ai.routes.js';
import scheduleRoutes from './routes/schedule.routes.js';
import postRoutes from './routes/post.routes.js';
import adminRoutes from './routes/admin.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../');

const app = express();

app.use(express.json({ limit: '20MB' }));
app.use(express.urlencoded({ limit: '20MB', extended: true }));

// Serve uploads
app.use('/api/media', express.static(path.join(PROJECT_ROOT, 'public/uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/facebook', facebookRoutes); // note: some routes were /api/facebook-apps, some /api/fanpages
app.use('/api/ai', aiRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Compatibility with legacy routes if needed
app.use('/api/facebook-apps', facebookRoutes);
app.use('/api/fanpages', facebookRoutes);

export default app;
