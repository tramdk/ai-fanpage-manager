import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { decrypt } from '../utils/encryption.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const TEMP_PASSWORD = 'password@123';

export async function register(email: string, password: string, name?: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('USER_EXISTS');

  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { email, password: hashedPassword, name } });
  return { message: 'Registration successful. Wait for activation.' };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('INVALID_CREDENTIALS');

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) throw new Error('INVALID_CREDENTIALS');

  const isDefaultAdmin = (email === (process.env.ADMIN_EMAIL || 'admin@floral.com') && password === (process.env.ADMIN_PASSWORD || 'admin123'));
  const isTempPassword = (password === TEMP_PASSWORD && user.requirePasswordChange);

  if (isDefaultAdmin || isTempPassword) {
    const setupToken = jwt.sign({ id: user.id, isSetup: true }, JWT_SECRET, { expiresIn: '15m' });
    throw Object.assign(new Error('PASSWORD_CHANGE_REQUIRED'), { setupToken, user: { id: user.id, email: user.email, name: user.name } });
  }

  if (!user.isActive && user.role !== 'admin') throw new Error('ACCOUNT_INACTIVE');

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive } };
}

export async function setupPassword(setupToken: string, newPassword: string) {
  const decoded = jwt.verify(setupToken, JWT_SECRET) as any;
  if (!decoded.isSetup) throw new Error('INVALID_TOKEN_TYPE');

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: decoded.id }, data: { password: hashedPassword, requirePasswordChange: false } });
  return { message: 'Security protocol completed.' };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('USER_NOT_FOUND');
  return { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive };
}

export async function getFacebookOAuthUrl(userId: string, token: string, origin: string, fbAppRecordId?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  let appId: string | undefined, appSecret: string | undefined;

  if (fbAppRecordId && fbAppRecordId !== 'legacy') {
    const appObj = await prisma.facebookApp.findFirst({ where: { id: fbAppRecordId, userId } });
    if (appObj) {
      appId = decrypt(appObj.appId, user.email);
      appSecret = decrypt(appObj.appSecret, user.email);
    }
  }

  if (!appId || !appSecret) {
    appId = user.facebookAppId ? decrypt(user.facebookAppId, user.email) : process.env.FACEBOOK_APP_ID;
    appSecret = user.facebookAppSecret ? decrypt(user.facebookAppSecret, user.email) : process.env.FACEBOOK_APP_SECRET;
  }

  if (!appId || !appSecret) throw Object.assign(new Error('Facebook App not configured'), { requires_config: true });

  const cleanOrigin = origin.replace(/\/$/, '');
  const backendUrl = (process.env.APP_URL || cleanOrigin).replace(/\/$/, '');
  const stateStr = Buffer.from(JSON.stringify({ 
    token,
    origin: cleanOrigin, 
    fbAppRecordId: fbAppRecordId || 'legacy' 
  })).toString('base64');
  const params = new URLSearchParams({ 
    client_id: appId, 
    redirect_uri: `${backendUrl}/auth/facebook/callback`, 
    response_type: 'code', 
    scope: 'pages_show_list,pages_read_engagement,pages_manage_posts', 
    state: stateStr 
  });

  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
}
