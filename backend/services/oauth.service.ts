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
    if (appObj) { 
      appId = decrypt(appObj.appId, user.email); 
      appSecret = decrypt(appObj.appSecret, user.email); 
      console.log(`[OAUTH] Using user-provided App ID: ${appId?.substring(0, 5)}...`);
    }
  }
  
  if (!appId || !appSecret) {
    appId = user.facebookAppId ? decrypt(user.facebookAppId, user.email) : process.env.FACEBOOK_APP_ID;
    appSecret = user.facebookAppSecret ? decrypt(user.facebookAppSecret, user.email) : process.env.FACEBOOK_APP_SECRET;
    console.log(`[OAUTH] Using system/legacy App ID: ${appId?.substring(0, 5)}...`);
  }

  if (!appId || !appSecret) {
    console.error('[OAUTH] ERROR: Facebook App ID or Secret is missing.');
    throw new Error('Facebook App not configured in server secrets.');
  }

  const backendUrl = (process.env.APP_URL || cleanOrigin).replace(/\/$/, '');
  const redirectUri = `${backendUrl}/auth/facebook/callback`;
  
  console.log(`[OAUTH] Exchanging code. Redirect URI: ${redirectUri}`);
  
  const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;
  
  // Use native https for better diagnostics in some environments
  const httpsRequest = (url: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const https = require('https');
      https.get(url, (res: any) => {
        let data = '';
        res.on('data', (chunk: any) => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(`Malformed JSON: ${data.substring(0, 100)}`)); }
        });
      }).on('error', (err: any) => {
        console.error('[HTTPS_CORE_ERROR]', err);
        reject(err);
      });
    });
  };

  try {
    const tData = await httpsRequest(tokenUrl);
    
    if (tData.error) {
      console.error('[OAUTH] Facebook Token Error:', tData.error);
      throw new Error(tData.error.message);
    }
    
    console.log('[OAUTH] Token exchange successful.');

    // Exchange for long-lived token
    const lLUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tData.access_token}`;
    const lLData = await httpsRequest(lLUrl);
    const userAccessToken = lLData.access_token || tData.access_token;
    
    // Fetch managed pages
    console.log(`[OAUTH] Fetching managed pages for user: ${user.email}`);
    const pUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${userAccessToken}&limit=100`;
    const pData = await httpsRequest(pUrl);
    
    if (pData.error) {
      console.error('[OAUTH] Facebook API Error (me/accounts):', pData.error);
      throw new Error(pData.error.message);
    }

    const pages = pData.data || [];
    console.log(`[OAUTH] Found ${pages.length} managed pages.`);

    // Sync to DB
    for (const page of pages) {
      console.log(`[OAUTH] Syncing page: ${page.name} (${page.id})`);
      await prisma.fanpage.upsert({
        where: { pageId: page.id },
        update: { 
          name: page.name, 
          accessToken: encrypt(page.access_token, user.email), 
          status: 'active', 
          userId: user.id 
        },
        create: { 
          pageId: page.id, 
          name: page.name, 
          accessToken: encrypt(page.access_token, user.email), 
          status: 'active', 
          userId: user.id 
        }
      });
    }

    if (pages.length === 0) {
      console.warn('[OAUTH] No pages found. Ensure permissions are granted.');
    }

    return pages;
  } catch (err: any) {
    console.error('[OAUTH_SERVICE] Fatal Error during exchange:', err.message);
    throw err;
  }
}
