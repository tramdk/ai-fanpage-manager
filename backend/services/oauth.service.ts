import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { encrypt, decrypt } from '../utils/encryption.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function handleFacebookCallback(code: string, state: string) {
  const stateObj = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
  const { token, fbAppRecordId, origin } = stateObj;
  const cleanOrigin = (origin || process.env.APP_URL || '').replace(/\/$/, '');

  if (!token) throw new Error('No session token found');
  const decoded = jwt.verify(token, JWT_SECRET) as any;
  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user) throw new Error('User not found');

  // Resolve App credentials
  let appId: string | undefined, appSecret: string | undefined;
  if (fbAppRecordId && fbAppRecordId !== 'legacy') {
    const appObj = await prisma.facebookApp.findUnique({ where: { id: fbAppRecordId, userId: user.id } });
    if (appObj) { appId = decrypt(appObj.appId, user.email); appSecret = decrypt(appObj.appSecret, user.email); }
  }
  if (!appId || !appSecret) {
    appId = user.facebookAppId ? decrypt(user.facebookAppId, user.email) : process.env.FACEBOOK_APP_ID;
    appSecret = user.facebookAppSecret ? decrypt(user.facebookAppSecret, user.email) : process.env.FACEBOOK_APP_SECRET;
  }

  // Exchange code for short-lived token
  const redirectUri = `${cleanOrigin}/auth/facebook/callback`;
  const tRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`);
  const tData = await tRes.json();
  if (tData.error) throw new Error(tData.error.message);

  // Exchange for long-lived token
  const lLRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tData.access_token}`);
  const lLData = await lLRes.json();
  const userAccessToken = lLData.access_token || tData.access_token;

  // Fetch managed pages
  const pRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${userAccessToken}&limit=100`);
  const pData = await pRes.json();
  const pages = pData.data || [];

  // Sync to DB
  for (const page of pages) {
    await prisma.fanpage.upsert({
      where: { pageId: page.id },
      update: { name: page.name, accessToken: encrypt(page.access_token, user.email), status: 'active', userId: user.id },
      create: { pageId: page.id, name: page.name, accessToken: encrypt(page.access_token, user.email), status: 'active', userId: user.id }
    });
  }

  return pages;
}
