const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
  restartApp: () => ipcRenderer.send('restart-app')
});
