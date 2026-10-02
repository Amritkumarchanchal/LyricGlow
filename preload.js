const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lyricsMirror', {
  getSources: () => ipcRenderer.invoke('get-sources'),
  screenPermission: () => ipcRenderer.invoke('screen-permission'),
  quit: () => ipcRenderer.send('quit'),
  onClickThrough: (cb) => ipcRenderer.on('click-through', (_e, v) => cb(v)),
  onSelectRegion: (cb) => ipcRenderer.on('select-region', () => cb()),
  onPickWindow: (cb) => ipcRenderer.on('pick-window', () => cb()),
});
