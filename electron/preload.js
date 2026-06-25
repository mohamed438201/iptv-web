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
  fetchApi: (url) => ipcRenderer.invoke('fetch-api', url),
  startDownload: (item) => ipcRenderer.invoke('start-download', item),
  pauseDownload: (id) => ipcRenderer.invoke('pause-download', id),
  getDownloads: () => ipcRenderer.invoke('get-downloads'),
  removeDownload: (id) => ipcRenderer.invoke('remove-download', id),
  onOfflineDownloadProgress: (callback) => ipcRenderer.on('on-download-progress', (event, data) => callback(data)),
  onOfflineDownloadComplete: (callback) => ipcRenderer.on('on-download-complete', (event, data) => callback(data)),
  showItemInFolder: (id) => ipcRenderer.invoke('show-item-in-folder', id)
});
