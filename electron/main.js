import { app, BrowserWindow, dialog } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
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

app.whenReady().then(() => {
  const mainWindow = createWindow();

  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('checking-for-update', () => {
    mainWindow.webContents.send('checking-for-update');
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update-not-available');
  });

  autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('update-available');
  });

  autoUpdater.on('download-progress', (progressObj) => {
    mainWindow.webContents.send('download-progress', progressObj.percent);
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update-downloaded');
  });

  import('electron').then(({ ipcMain }) => {
    ipcMain.on('restart-app', () => {
      autoUpdater.quitAndInstall();
    });
    
    ipcMain.on('check-for-updates', () => {
      autoUpdater.checkForUpdates();
    });
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
