const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 'upgrade-insecure-requests');
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
