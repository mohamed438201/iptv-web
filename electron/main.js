import { app, BrowserWindow, dialog, session, ipcMain } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import axios from 'axios';
import { initRPC, setActivity } from './discord-rpc.js';
import { createRequire } from 'module';
import { initDownloadManager, ENCRYPTION_KEY, ALGORITHM } from './downloadManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allow video autoplay without user gesture
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');

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
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // Disable webSecurity to bypass CORS and mixed content for IPTV streams
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../public/logo.png')
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

  ipcMain.removeAllListeners('minimize-window');
  ipcMain.removeAllListeners('maximize-window');
  ipcMain.removeAllListeners('close-window');

  ipcMain.on('minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
  });
  
  ipcMain.on('maximize-window', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });
  
  ipcMain.on('close-window', () => {
    if (mainWindow) mainWindow.close();
  });

  return mainWindow;
}

app.whenReady().then(async () => {
  // Inject VLC User-Agent globally and strip Origin/Referer for external URLs
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const url = details.url.toLowerCase();
    const isYouTube = url.includes('youtube.com') || url.includes('googleapis.com') || url.includes('ytimg.com') || url.includes('googlevideo.com') || url.includes('doubleclick.net');
    
    if (!isYouTube) {
      details.requestHeaders['User-Agent'] = 'VLC/3.0.18 LibVLC/3.0.18';
      
      if (!url.startsWith('http://localhost') && !url.startsWith('http://127.0.0.1') && !url.startsWith('file://')) {
        delete details.requestHeaders['Origin'];
        delete details.requestHeaders['Referer'];
      }
    }
    
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  // Local proxy server to bypass HSTS, CORS, and Cloudflare issues
  import('http').then(({ createServer, Agent: HttpAgent }) => {
    import('https').then(({ Agent: HttpsAgent }) => {
      const globalHttpAgent = new HttpAgent({ keepAlive: true, maxSockets: 1 });
      const globalHttpsAgent = new HttpsAgent({ keepAlive: true, maxSockets: 1 });

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
          
          if (targetUrl.startsWith('offline.m3u8?id=')) {
            const id = new URL(`http://127.0.0.1/${targetUrl}`).searchParams.get('id');
            const hlsDir = path.join(app.getPath('userData'), 'downloads', `${id}_hls`);
            
            if (!fs.existsSync(hlsDir)) {
              res.writeHead(404);
              return res.end('Offline HLS not found');
            }

            const files = fs.readdirSync(hlsDir).filter(f => f.endsWith('.enc'));
            const numSegments = files.length;
            
            // Try to read target duration from metadata
            let targetDuration = 10;
            try {
              const metadataFile = path.join(app.getPath('userData'), 'downloads', 'metadata.json');
              if (fs.existsSync(metadataFile)) {
                const meta = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
                if (meta[id] && meta[id].targetDuration) {
                  targetDuration = meta[id].targetDuration;
                }
              }
            } catch (e) {
              console.error(e);
            }

            let m3u8 = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:${targetDuration}\n#EXT-X-PLAYLIST-TYPE:VOD\n`;
            for(let i=0; i<numSegments; i++) {
              m3u8 += `#EXTINF:${targetDuration}.0,\nhttp://127.0.0.1:12121/offline-segment?id=${id}&seq=${i}\n`;
            }
            m3u8 += "#EXT-X-ENDLIST\n";

            res.writeHead(200, {
              'Content-Type': 'application/vnd.apple.mpegurl',
              'Access-Control-Allow-Origin': '*'
            });
            return res.end(m3u8);
          }

          if (targetUrl.startsWith('offline-segment?id=')) {
            const urlObj = new URL(`http://127.0.0.1/${targetUrl}`);
            const id = urlObj.searchParams.get('id');
            const seq = urlObj.searchParams.get('seq');
            const filePath = path.join(app.getPath('userData'), 'downloads', `${id}_hls`, `${seq}.enc`);

            if (!fs.existsSync(filePath)) {
              res.writeHead(404);
              return res.end('Segment not found');
            }

            res.writeHead(200, {
              'Content-Type': 'video/MP2T',
              'Access-Control-Allow-Origin': '*'
            });
            
            const iv = Buffer.alloc(16, 0);
            const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
            fs.createReadStream(filePath).pipe(decipher).pipe(res);
            return;
          }

          if (targetUrl.startsWith('offline?id=')) {
            const id = new URL(`http://127.0.0.1/${targetUrl}`).searchParams.get('id');
            const downloadsDir = path.join(app.getPath('userData'), 'downloads');
            const filePath = path.join(downloadsDir, `${id}.enc`);
            
            if (!fs.existsSync(filePath)) {
              res.writeHead(404);
              return res.end('Offline file not found');
            }

            const stat = fs.statSync(filePath);
            const fileSize = stat.size;
            const range = req.headers.range;

            if (range) {
              const parts = range.replace(/bytes=/, "").split("-");
              const start = parseInt(parts[0], 10);
              const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
              const chunksize = (end - start) + 1;
              
              const blockOffset = BigInt(Math.floor(start / 16));
              const byteOffsetInBlock = start % 16;
              const iv = Buffer.alloc(16, 0);
              
              let counter = blockOffset;
              for (let i = 15; i >= 0; i--) {
                iv[i] = Number(counter & 255n);
                counter >>= 8n;
              }
              
              const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
              decipher.setAutoPadding(false);
              
              const file = fs.createReadStream(filePath, { start: start - byteOffsetInBlock, end });
              
              res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
              });
              
              let discarded = 0;
              file.pipe(decipher).on('data', (chunk) => {
                if (discarded < byteOffsetInBlock) {
                  const toDiscard = Math.min(byteOffsetInBlock - discarded, chunk.length);
                  discarded += toDiscard;
                  if (chunk.length > toDiscard) {
                    res.write(chunk.slice(toDiscard));
                  }
                } else {
                  res.write(chunk);
                }
              }).on('end', () => res.end());

              return;
            } else {
              res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
              });
              
              const iv = Buffer.alloc(16, 0);
              const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
              fs.createReadStream(filePath).pipe(decipher).pipe(res);
              return;
            }
          }

          if (!targetUrl.startsWith('http')) {
            res.writeHead(400);
            return res.end('Invalid url parameter');
          }

          const parsedUrl = new URL(targetUrl);
          const controller = new AbortController();
          
          req.on('close', () => controller.abort());

          const proxyHeaders = { ...req.headers };
          delete proxyHeaders['host'];
          delete proxyHeaders['origin'];
          delete proxyHeaders['referer'];
          
          axios({
            method: req.method,
            url: parsedUrl.toString(),
            headers: {
              ...proxyHeaders,
              'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
              'Accept': '*/*'
            },
            responseType: 'stream',
            maxRedirects: 5,
            validateStatus: () => true,
            signal: controller.signal,
            httpAgent: globalHttpAgent,
            httpsAgent: globalHttpsAgent
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
  });

  const mainWindow = createWindow();
  initDownloadManager(mainWindow);
  
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
