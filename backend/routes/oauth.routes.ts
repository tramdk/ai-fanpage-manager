import { Router } from 'express';
import * as oauthService from '../services/oauth.service.js';

const router = Router();

router.get(['/facebook/callback', '/facebook/callback/'], async (req, res) => {
  const { code, error, error_description, state } = req.query as Record<string, string>;
  console.log(`[OAUTH_ROUTE] Callback received. Code: ${code ? 'YES' : 'NO'}, Error: ${error || 'NONE'}`);

  if (error) {
    const errorMsg = error_description || error;
    return res.send(`<html><body><script>
      console.error('FB Auth Error:', "${errorMsg}");
      if(window.opener){
        window.opener.postMessage({type:'FACEBOOK_AUTH_ERROR',error:"${errorMsg}"},'*');
        setTimeout(() => window.close(), 1000);
      } else {
        alert("Lỗi kết nối: ${errorMsg}");
        window.location.href='/';
      }
    </script></body></html>`);
  }

  try {
    const pages = await oauthService.handleFacebookCallback(code, state);
    const pagesJson = JSON.stringify(pages);
    res.send(`<html><body><script>
      console.log('FB Auth Success. Pages found:', ${pages.length});
      if(window.opener){
        try {
          window.opener.postMessage({type:'FACEBOOK_AUTH_SUCCESS',payload:${pagesJson}},'*');
          console.log('Message sent to opener.');
        } catch (e) {
          console.error('Failed to send postMessage:', e);
        }
        setTimeout(() => window.close(), 500);
      } else {
        console.warn('No opener found. Redirecting...');
        window.location.href='/?auth_success=true';
      }
    </script></body></html>`);
  } catch (err: any) {
    console.error('[OAUTH_ROUTE] Service Error:', err.message);
    res.send(`<html><body><script>
      const msg = "${err.message.replace(/"/g, "'")}";
      if(window.opener){
        window.opener.postMessage({type:'FACEBOOK_AUTH_ERROR',error: msg},'*');
        setTimeout(() => window.close(), 2000);
      } else {
        alert("Lỗi server: " + msg);
        window.location.href='/';
      }
    </script></body></html>`);
  }
});

export default router;
