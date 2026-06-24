import { app, BrowserWindow, dialog, session } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { initRPC, setActivity } from './discord-rpc.js';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Backend Server with Remote DB Configuration
process.env.DB_HOST = '135.125.196.203';
process.env.DB_USER = 'adminmysqll';
process.env.DB_PASS = 'XLb(226ba[<T';
process.env.DB_NAME = 'iptv';
process.env.PORT = '5000'; // Express server port

try {
  const customRequire = createRequire(import.meta.url);
  const backendPath = path.join(__dirname, '../backend/server.js');
  customRequire(backendPath);
  console.log('Backend server started successfully within Electron');
} catch (err) {
  console.error('Failed to start backend server:', err);
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: 'rgba(0, 0, 0, 0)',
      symbolColor: '#ffffff',
      height: 32
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // Disable webSecurity to bypass CORS and mixed content for IPTV streams
    },
    autoHideMenuBar: true
  });

  // Check if we are running in development mode
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    // In dev, load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built React app
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  return mainWindow;
}

app.whenReady().then(async () => {
  // Inject VLC User-Agent globally so direct stream URLs work without the local proxy
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = 'VLC/3.0.18 LibVLC/3.0.18';
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  // Local proxy server to bypass HSTS, CORS, and Cloudflare issues
  import('http').then(({ createServer }) => {
    const proxyServer = createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
      }

      try {
        const targetUrl = req.url.slice(1);
        if (!targetUrl.startsWith('http')) {
          res.writeHead(400);
          return res.end('Invalid url parameter');
        }

        const parsedUrl = new URL(targetUrl);
        const controller = new AbortController();
        
        req.on('close', () => controller.abort());

        axios({
          method: req.method,
          url: parsedUrl.toString(),
          headers: {
            'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
            'Accept': '*/*'
          },
          responseType: 'stream',
          maxRedirects: 5,
          validateStatus: () => true,
          signal: controller.signal
        }).then(response => {
          const headers = { ...response.headers };
          delete headers['content-encoding'];
          delete headers['content-length'];
          delete headers['transfer-encoding'];
          
          res.writeHead(response.status, headers);
          response.data.pipe(res);
        }).catch(err => {
          if (axios.isCancel(err)) return;
          console.error('Proxy request error:', err.message);
          if (!res.headersSent) res.writeHead(502);
          res.end();
        });
      } catch (err) {
        console.error('Proxy server error:', err.message);
        if (!res.headersSent) res.writeHead(500);
        res.end();
      }
    });

    proxyServer.listen(12121, '127.0.0.1', () => {
      console.log('Local IPTV Proxy listening on http://127.0.0.1:12121');
    });
  });

  const mainWindow = createWindow();
  
  initRPC();
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('checking-for-update', () => mainWindow.webContents.send('checking-for-update'));
  autoUpdater.on('update-not-available', () => mainWindow.webContents.send('update-not-available'));
  autoUpdater.on('update-available', () => mainWindow.webContents.send('update-available'));
  autoUpdater.on('download-progress', (p) => mainWindow.webContents.send('download-progress', p.percent));
  autoUpdater.on('update-downloaded', () => mainWindow.webContents.send('update-downloaded'));

  import('electron').then(({ ipcMain }) => {
    ipcMain.on('restart-app', () => autoUpdater.quitAndInstall());
    ipcMain.on('check-for-updates', () => autoUpdater.checkForUpdates());
    ipcMain.on('set-discord-activity', (event, { details, state }) => setActivity(details, state));

    ipcMain.handle('fetch-api', async (event, url) => {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18', 'Accept': '*/*' }
        });
        if (response.ok) {
          const data = await response.json();
          return { ok: true, status: response.status, data };
        } else {
          return { ok: false, status: response.status, error: `HTTP ${response.status}` };
        }
      } catch (error) {
        return { ok: false, status: 0, error: error.message };
      }
    });
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
