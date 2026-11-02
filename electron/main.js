const { app, BrowserWindow, shell, globalShortcut, dialog } = require('electron');
const path = require('path');
const http = require('http');
const net = require('net');
const { spawn, execSync } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let serverProcess = null;
let currentPort = 3000;

const isPackaged = app.isPackaged;
const REMOTE_URL = 'https://myujiku.vercel.app';

// Ensure single instance lock like Spotify
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => {
      srv.close(() => resolve(true));
    });
    srv.listen(port, '127.0.0.1');
  });
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

async function getPreferredPort() {
  if (await isPortAvailable(3333)) return 3333;
  if (await isPortAvailable(3334)) return 3334;
  return getFreePort();
}

function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        if (res.statusCode && res.statusCode < 500) {
          resolve(true);
        } else {
          retry();
        }
      });
      req.on('error', () => retry());
      req.setTimeout(800, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        return reject(new Error(`Timeout waiting for server at ${url}`));
      }
      setTimeout(check, 100);
    };

    check();
  });
}

async function startServer() {
  if (!isPackaged) {
    // In dev mode, check if dev server is running on 3000
    try {
      await waitForServer('http://127.0.0.1:3000', 1000);
      currentPort = 3000;
      return 'http://127.0.0.1:3000';
    } catch {
      // If dev server not running, continue to start standalone
    }
  }

  currentPort = await getPreferredPort();

  const standaloneDir = isPackaged
    ? path.join(process.resourcesPath, 'standalone')
    : path.join(__dirname, '..', '.next', 'standalone');

  const serverScript = path.join(standaloneDir, 'server.js');

  const ytDlpPath = isPackaged
    ? path.join(process.resourcesPath, 'yt-dlp.exe')
    : path.join(__dirname, '..', 'yt-dlp.exe');

  if (!fs.existsSync(serverScript)) {
    throw new Error(`Standalone server script not found at ${serverScript}`);
  }

  const logFile = path.join(app.getPath('userData'), 'server.log');
  let logStream = null;
  try {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    logStream = fs.createWriteStream(logFile, { flags: 'a' });
  } catch {
    // ignore logging failure
  }

  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(currentPort),
    HOSTNAME: '127.0.0.1',
    ELECTRON_RUN_AS_NODE: '1',
    YT_DLP_PATH: ytDlpPath,
    NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${currentPort}`,
  };

  serverProcess = spawn(process.execPath, [serverScript], {
    cwd: standaloneDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  if (logStream) {
    serverProcess.stdout.pipe(logStream);
    serverProcess.stderr.pipe(logStream);
  }

  serverProcess.on('error', (err) => {
    console.error('Failed to spawn Next.js server:', err);
  });

  const serverUrl = `http://127.0.0.1:${currentPort}`;
  await waitForServer(serverUrl, 15000);
  return serverUrl;
}

function killServerProcess() {
  if (serverProcess && serverProcess.pid) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: 'ignore' });
      } else {
        serverProcess.kill('SIGTERM');
      }
    } catch {
      // ignore
    }
    serverProcess = null;
  }
}

function registerMediaKeys() {
  try {
    globalShortcut.register('MediaPlayPause', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('media-key', 'play-pause');
      }
    });
    globalShortcut.register('MediaNextTrack', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('media-key', 'next');
      }
    });
    globalShortcut.register('MediaPreviousTrack', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('media-key', 'prev');
      }
    });
  } catch (err) {
    console.warn('Could not register media shortcuts:', err);
  }
}

async function createMainWindow(appUrl) {
  const iconPath = path.join(__dirname, '..', 'build', 'icon.ico');

  mainWindow = new BrowserWindow({
    width: 1300,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#000000',
    title: 'Myujiku',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#000000',
      symbolColor: '#a7a7a7',
      height: 38,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      backgroundThrottling: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Fallback handler if load fails
  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    // Ignore user aborts (such as pressing Ctrl+R or F5 reload)
    if (errorCode === -3) {
      return;
    }
    console.warn(`Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
    if (validatedURL !== REMOTE_URL) {
      console.log('Redirecting to remote fallback URL:', REMOTE_URL);
      mainWindow.loadURL(REMOTE_URL).catch(() => {});
    }
  });

  await mainWindow.loadURL(appUrl);
}

app.whenReady().then(async () => {
  let targetUrl = REMOTE_URL;

  // Check if force remote via argument or environment
  const forceRemote = process.argv.includes('--remote') || process.env.MYUJIKU_USE_REMOTE === '1';

  if (!forceRemote) {
    try {
      targetUrl = await startServer();
    } catch (err) {
      console.warn('Could not launch local server, falling back to Vercel production URL:', err.message);
      targetUrl = REMOTE_URL;
    }
  }

  try {
    await createMainWindow(targetUrl);
    registerMediaKeys();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow(targetUrl);
      }
    });
  } catch (err) {
    dialog.showErrorBox('Myujiku Error', `Could not open application: ${err.message}`);
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  killServerProcess();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    killServerProcess();
    app.quit();
  }
});
