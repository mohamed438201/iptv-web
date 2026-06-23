const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onCheckingForUpdate: (callback) => ipcRenderer.on('checking-for-update', callback),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', callback),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
  restartApp: () => ipcRenderer.send('restart-app'),
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  setDiscordActivity: (details, state) => ipcRenderer.send('set-discord-activity', { details, state }),
  fetchApi: (url) => ipcRenderer.invoke('fetch-api', url)
});
