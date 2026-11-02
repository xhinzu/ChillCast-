const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('myujikuDesktop', {
  isDesktop: true,
  platform: process.platform,
  version: '1.0.0',
  onMediaKey: (callback) => {
    const handler = (_, key) => callback(key);
    ipcRenderer.on('media-key', handler);
    return () => ipcRenderer.removeListener('media-key', handler);
  },
  sendWindowAction: (action) => ipcRenderer.send('window-action', action),
});
