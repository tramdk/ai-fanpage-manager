import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import fanpageRoutes from './routes/fanpage.routes.js';
import fbAppRoutes from './routes/fbapp.routes.js';
import aiRoutes from './routes/ai.routes.js';
import scheduleRoutes from './routes/schedule.routes.js';
import postRoutes from './routes/post.routes.js';
import adminRoutes from './routes/admin.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import topicRoutes from './routes/topic.routes.js';
import oauthRoutes from './routes/oauth.routes.js';
import cors from 'cors';

const __filename = typeof import.meta.url !== 'undefined' ? fileURLToPath(import.meta.url) : '';
const __dirname = __filename ? path.dirname(__filename) : process.cwd();
const PROJECT_ROOT = path.resolve(__dirname, __filename ? '../' : './');

const app = express();

app.use(cors());

app.use(express.json({ limit: '20MB' }));
app.use(express.urlencoded({ limit: '20MB', extended: true }));

// Serve uploads
app.use('/api/media', express.static(path.join(PROJECT_ROOT, 'public/uploads')));

// Health check for anti-sleep ping
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/topics', topicRoutes);

// Detailed Facebook/Fanpage routing
app.use('/api/fanpages', fanpageRoutes);
app.use('/api/facebook-apps', fbAppRoutes);
app.use('/api/facebook', fanpageRoutes); // For /api/facebook/post and /api/facebook/exchange-token

// [OAUTH] Callback handler MUST be top-level or whatever redirect_uri is set to
app.use('/auth', oauthRoutes);

export default app;
