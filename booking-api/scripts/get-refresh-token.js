// One-shot script: log in as the Workspace user (talkwith@levashou.pl)
// and print a Google OAuth2 refresh_token to paste into Railway env.
//
// Usage:
//   1. cp .env.local.example .env.local  (or set env vars manually)
//   2. fill GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET (Desktop app type)
//   3. node scripts/get-refresh-token.js
//   4. browser opens, sign in as the Workspace user, allow access
//   5. copy printed refresh_token into Railway: GOOGLE_OAUTH_REFRESH_TOKEN

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const http = require('http');
const { OAuth2Client } = require('google-auth-library');
const open = require('open').default || require('open');

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/oauth/callback';
const SCOPE = 'https://www.googleapis.com/auth/calendar';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET');
  console.error('Put them in booking-api/.env.local or export as env vars.');
  process.exit(1);
}

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPE,
  prompt: 'consent'
});

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/oauth/callback')) {
    res.writeHead(404);
    res.end();
    return;
  }
  const url = new URL(req.url, `http://localhost:3000`);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>Auth error: ${error}</h1><p>Close this tab and re-run the script.</p>`);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400);
    res.end('Missing code');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>Done. Refresh token printed in the terminal. You can close this tab.</h1>');

    if (!tokens.refresh_token) {
      console.error('\nNo refresh_token returned by Google.');
      console.error('Likely cause: this app already issued one. Revoke access at');
      console.error('  https://myaccount.google.com/permissions');
      console.error('then re-run this script.');
      server.close();
      process.exit(1);
    }

    console.log('\n=================================================================');
    console.log('REFRESH TOKEN (paste into Railway env GOOGLE_OAUTH_REFRESH_TOKEN):');
    console.log('=================================================================');
    console.log(tokens.refresh_token);
    console.log('=================================================================\n');
    server.close();
    process.exit(0);
  } catch (e) {
    console.error('Token exchange failed:', e.message);
    res.writeHead(500);
    res.end('Token exchange failed');
    server.close();
    process.exit(1);
  }
});

server.listen(3000, () => {
  console.log('Local OAuth server listening on http://localhost:3000');
  console.log('Opening browser for consent...');
  open(authUrl).catch(() => {
    console.log('\nCould not open browser automatically. Open this URL manually:');
    console.log(authUrl);
  });
});
