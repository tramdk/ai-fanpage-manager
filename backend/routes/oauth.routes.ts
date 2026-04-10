import { Router } from 'express';
import * as oauthService from '../services/oauth.service.js';

const router = Router();

router.get(['/facebook/callback', '/facebook/callback/'], async (req, res) => {
  const { code, error, error_description, state } = req.query as Record<string, string>;

  if (error) {
    return res.send(`<html><body><script>if(window.opener){window.opener.postMessage({type:'FACEBOOK_AUTH_ERROR',error:'${error_description || error}'},'*');window.close();}else{window.location.href='/';}</script></body></html>`);
  }

  try {
    const pages = await oauthService.handleFacebookCallback(code, state);
    res.send(`<html><body><script>if(window.opener){window.opener.postMessage({type:'FACEBOOK_AUTH_SUCCESS',payload:${JSON.stringify(pages)}},'*');window.close();}else{window.location.href='/';}</script></body></html>`);
  } catch (err: any) {
    res.send(`<html><body><script>if(window.opener){window.opener.postMessage({type:'FACEBOOK_AUTH_ERROR',error:'${err.message}'},'*');window.close();}else{window.location.href='/';}</script></body></html>`);
  }
});

export default router;
