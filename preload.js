const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('grab', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  setShortcut: value => ipcRenderer.invoke('config:shortcut', value),
  onOverlayInit: callback => ipcRenderer.on('overlay:init', (_event, data) => callback(data)),
  cancel: () => ipcRenderer.send('overlay:cancel'),
  select: data => ipcRenderer.send('overlay:selection', data),
  overlayReady: () => ipcRenderer.send('overlay:ready')
});
