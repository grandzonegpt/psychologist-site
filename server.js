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
// GA4 routes EEA traffic to a regional endpoint (region1.google-analytics.com),
// not www, so connect-src and img-src need https://*.google-analytics.com.
// Without the wildcard the browser blocks every /g/collect hit and GA4 stays empty.
// Google Ads conversions: modern gtag.js posts the conversion ping (and Consent
// Mode /ccm/collect) to pagead2.googlesyndication.com, NOT googleadservices.com.
// Without it in connect-src + img-src the CSP silently blocks every conversion
// (GA4 keeps working on *.google-analytics.com), so Ads shows 0 conversions.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://*.clarity.ms https://connect.facebook.net https://snap.licdn.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://www.google-analytics.com https://*.google-analytics.com https://stats.g.doubleclick.net https://googleads.g.doubleclick.net https://www.googleadservices.com https://www.google.com https://pagead2.googlesyndication.com https://www.facebook.com https://px.ads.linkedin.com https://*.clarity.ms",
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://stats.g.doubleclick.net https://googleads.g.doubleclick.net https://www.googleadservices.com https://www.google.com https://pagead2.googlesyndication.com https://booking-api-production-c2ca.up.railway.app https://www.facebook.com https://px.ads.linkedin.com https://*.clarity.ms",
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
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
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

// Credential scans must NOT be immutable-cached: if a redaction is updated,
// the old copy must not stay stuck at the CDN for a year. Serve them with
// revalidation so fixes propagate immediately. Declared before the general
// /assets rule so it wins for this path.
app.use('/assets/credentials', express.static(path.join(__dirname, 'assets', 'credentials'), {
  setHeaders(res) {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  }
}));

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

// Serve index.html at /. The /index.html URL 301s to / (redirects map below)
// so Google sees exactly one homepage URL.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Booking thank-you pages — clean URLs without .html. Stripe success_url
// redirects here after a confirmed payment.
app.get('/spasibo', (req, res) => {
  res.sendFile(path.join(__dirname, 'spasibo.html'));
});
app.get('/dziekuje', (req, res) => {
  res.sendFile(path.join(__dirname, 'dziekuje.html'));
});

// 301 redirects for renamed pages
const redirects = {
  '/index.html': '/',
  '/sos.html': '/practices.html',
  '/sos-pl.html': '/practices-pl.html',
  // legacy URLs still in Google's index, now renamed
  '/terms.html': '/regulamin.html',
  '/assets/checklist-7-signs.pdf': '/assets/checklist-7-signs-ru.pdf',
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
