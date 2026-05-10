const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');

// Security headers applied to every response (200, 301, 404, 410, etc).
// Centralised here so a future code path can't forget them. Targeting an
// «A» grade on securityheaders.com — pragmatic for a static psychotherapy
// site. CSP keeps 'unsafe-inline' on script-src because the home page
// already has inline GA4 + Consent Mode v2 + theme-switch script; moving
// to nonces or hashes is a separate hardening pass.
// Tracking scripts loaded conditionally in main.js after cookie consent:
// Microsoft Clarity (clarity.ms), Meta Pixel (connect.facebook.net + pixel
// posts to facebook.com), LinkedIn Insight (snap.licdn.com + px.ads.linkedin.com).
// Without these in the allow-list, accepting cookies silently fails on CSP.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://connect.facebook.net https://snap.licdn.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://www.google-analytics.com https://stats.g.doubleclick.net https://www.facebook.com https://px.ads.linkedin.com https://*.clarity.ms",
  "connect-src 'self' https://www.google-analytics.com https://stats.g.doubleclick.net https://booking-api-production-c2ca.up.railway.app https://www.facebook.com https://px.ads.linkedin.com https://*.clarity.ms",
  "object-src 'none'",
  "base-uri 'self'",
  // form-action 'self' only: Stripe Checkout is a JS redirect (window.location),
  // not a cross-origin form submit, so checkout.stripe.com is not needed here.
  // Earlier 'https://www.mollie.com' was leftover from another project.
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ');
const SECURITY_HEADERS = {
  'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'content-security-policy': CSP,
};
app.use((req, res, next) => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(k, v);
  }
  next();
});

// Static assets with long cache
app.use('/assets', express.static(path.join(__dirname, 'assets'), {
  maxAge: '1y',
  immutable: true
}));
app.use('/css', express.static(path.join(__dirname, 'css'), {
  maxAge: '1y',
  immutable: true
}));
app.use('/js', express.static(path.join(__dirname, 'js'), {
  maxAge: '1y',
  immutable: true
}));

// Sitemap and robots - explicit routes
app.get('/sitemap.xml', (req, res) => {
  res.setHeader('Content-Type', 'application/xml');
  res.sendFile(path.join(__dirname, 'sitemap.xml'));
});
app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.sendFile(path.join(__dirname, 'robots.txt'));
});

// Redirect /index.html → / and /index-pl.html → /pl (avoid duplicate content)
app.get('/index.html', (req, res) => {
  res.redirect(301, '/');
});
// Serve index.html at /
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 301 redirects for renamed pages
const redirects = {
  '/sos.html': '/practices.html',
  '/sos-pl.html': '/practices-pl.html',
};

app.use((req, res, next) => {
  const target = redirects[req.path];
  if (target) {
    return res.redirect(301, target);
  }
  next();
});

// 410 Gone for permanently removed content
const gone = new Set([
  '/blog/coaching-vs-psychology.html',
  '/blog-pl/coaching-vs-psychology.html',
  '/blog/trauma.html',
  '/blog-pl/trauma.html',
]);

app.use((req, res, next) => {
  if (gone.has(req.path)) {
    res.status(410);
    return res.sendFile(path.join(__dirname, '404.html'));
  }
  next();
});

// HTML and other files with no cache
app.use(express.static(path.join(__dirname), {
  maxAge: 0
}));

// 404 for unknown routes (proper status, not silent rewrite to index)
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
