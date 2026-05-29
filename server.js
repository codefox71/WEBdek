const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const DISPLAY = ':100';
const RFB_PORT = 5900;
const NOVNC_PORT = 6080;
const HOST = process.env.HOST || '0.0.0.0';
const NOVNC_PATHS = ['/usr/share/novnc', '/usr/local/share/novnc'];
const NOVNC_PATH = NOVNC_PATHS.find(fs.existsSync);
let xvfbProcess = null;
let x11vncProcess = null;
let websockifyProcess = null;

const apps = [
  { id: 'xterm', label: 'Terminal', command: 'xterm', icon: '🖥️' },
  { id: 'xclock', label: 'Clock', command: 'xclock', icon: '⏰' },
  { id: 'xeyes', label: 'Eyes', command: 'xeyes', icon: '👀' },
  { id: 'xlogo', label: 'X11 Logo', command: 'xlogo', icon: '🪟' }
];

function startDisplay() {
  if (xvfbProcess) {
    return;
  }

  xvfbProcess = spawn('Xvfb', [DISPLAY, '-screen', '0', '1280x800x24', '-nolisten', 'tcp'], {
    stdio: ['ignore', 'inherit', 'inherit']
  });

  xvfbProcess.on('exit', (code, signal) => {
    console.log(`Xvfb process exited with code=${code} signal=${signal}`);
    xvfbProcess = null;
  });

  xvfbProcess.on('error', (error) => {
    console.error('Failed to start Xvfb:', error);
    xvfbProcess = null;
  });

  x11vncProcess = spawn('x11vnc', ['-display', DISPLAY, '-localhost', '-nopw', '-forever', '-shared', '-rfbport', `${RFB_PORT}`], {
    stdio: ['ignore', 'inherit', 'inherit']
  });

  x11vncProcess.on('exit', (code, signal) => {
    console.log(`x11vnc process exited with code=${code} signal=${signal}`);
    x11vncProcess = null;
  });

  x11vncProcess.on('error', (error) => {
    console.error('Failed to start x11vnc:', error);
    x11vncProcess = null;
  });

  if (NOVNC_PATH) {
    websockifyProcess = spawn('python3', ['-m', 'websockify', `0.0.0.0:${NOVNC_PORT}`, `127.0.0.1:${RFB_PORT}`, `--web=${NOVNC_PATH}`], {
      stdio: ['ignore', 'inherit', 'inherit']
    });

    websockifyProcess.on('exit', (code, signal) => {
      console.log(`websockify process exited with code=${code} signal=${signal}`);
      websockifyProcess = null;
    });

    websockifyProcess.on('error', (error) => {
      console.error('Failed to start websockify:', error);
      websockifyProcess = null;
    });
  } else {
    console.warn(`noVNC path not found; expected one of: ${NOVNC_PATHS.join(', ')}`);
  }
}

function launchApp(command) {
  const child = spawn(command, {
    detached: true,
    env: { ...process.env, DISPLAY },
    stdio: 'ignore'
  });
  child.unref();
}

function stopDisplay() {
  [websockifyProcess, x11vncProcess, xvfbProcess].forEach((proc) => {
    if (proc) {
      proc.kill('SIGTERM');
    }
  });
  xvfbProcess = null;
  x11vncProcess = null;
  websockifyProcess = null;
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
  res.json({ display: DISPLAY, vncRunning: !!x11vncProcess, noVncAvailable: !!NOVNC_PATH });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, HOST, () => {
  console.log(`WEBdek server running on http://${HOST === '0.0.0.0' ? '0.0.0.0' : HOST}:${PORT}`);
  console.log(`noVNC web client will be available on http://${HOST === '0.0.0.0' ? '0.0.0.0' : HOST}:${NOVNC_PORT}/vnc.html`);
  startDisplay();
});

process.on('SIGINT', () => {
  stopDisplay();
  process.exit(0);
});
process.on('SIGTERM', () => {
  stopDisplay();
  process.exit(0);
});
