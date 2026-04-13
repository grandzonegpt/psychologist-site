const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');

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

// HTML and other files with no cache
app.use(express.static(path.join(__dirname), {
  maxAge: 0
}));

// SPA fallback - serve index.html for unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
