const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const { createProxyMiddleware } = require('http-proxy-middleware');

const XPRA_DISPLAY = ':100';
const XPRA_HTTP_PORT = 14500;
let xpraProcess = null;

const apps = [
  { id: 'xterm', label: 'Terminal', command: 'xterm', icon: '🖥️' },
  { id: 'xclock', label: 'Clock', command: 'xclock', icon: '⏰' },
  { id: 'xeyes', label: 'Eyes', command: 'xeyes', icon: '👀' },
  { id: 'xlogo', label: 'X11 Logo', command: 'xlogo', icon: '🪟' }
];

function startXpra() {
  if (xpraProcess) {
    return;
  }

  xpraProcess = spawn('xpra', [
    'start',
    XPRA_DISPLAY,
    `--bind-tcp=127.0.0.1:${XPRA_HTTP_PORT}`,
    '--html=on',
    '--exit-with-children',
    '--daemon=no',
    '--start-child=xterm'
  ], {
    stdio: ['ignore', 'inherit', 'inherit']
  });

  xpraProcess.on('exit', (code, signal) => {
    console.log(`Xpra process exited with code=${code} signal=${signal}`);
    xpraProcess = null;
  });

  xpraProcess.on('error', (error) => {
    console.error('Failed to start xpra:', error);
    xpraProcess = null;
  });
}

function launchApp(command) {
  const child = spawn('xpra', ['exec', XPRA_DISPLAY, command], {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
}

function stopXpra() {
  if (!xpraProcess) {
    return;
  }
  xpraProcess.kill('SIGTERM');
  xpraProcess = null;
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  '/xpra',
  createProxyMiddleware({
    target: `http://127.0.0.1:${XPRA_HTTP_PORT}`,
    changeOrigin: true,
    ws: true,
    pathRewrite: { '^/xpra': '/' }
  })
);

app.get('/api/apps', (req, res) => {
  res.json({ apps });
});

app.post('/api/launch', (req, res) => {
  const { id } = req.body || {};
  const appConfig = apps.find((item) => item.id === id);
  if (!appConfig) {
    return res.status(400).json({ error: 'Unknown app id' });
  }

  try {
    launchApp(appConfig.command);
    return res.json({ success: true, message: `${appConfig.label} launched.` });
  } catch (error) {
    console.error('Launch error:', error);
    return res.status(500).json({ error: 'Failed to launch app' });
  }
});

app.get('/api/status', (req, res) => {
  res.json({ xpraRunning: !!xpraProcess, display: XPRA_DISPLAY });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`WEBdek server running on http://localhost:${PORT}`);
  startXpra();
});

process.on('SIGINT', () => {
  stopXpra();
  process.exit(0);
});
process.on('SIGTERM', () => {
  stopXpra();
  process.exit(0);
});
