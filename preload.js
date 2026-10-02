const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lyricsMirror', {
  getSources: () => ipcRenderer.invoke('get-sources'),
  screenPermission: () => ipcRenderer.invoke('screen-permission'),
  getOpenAtLogin: () => ipcRenderer.invoke('get-open-at-login'),
  setOpenAtLogin: (enabled) => ipcRenderer.invoke('set-open-at-login', enabled),
  quit: () => ipcRenderer.send('quit'),
  onClickThrough: (cb) => ipcRenderer.on('click-through', (_e, v) => cb(v)),
  onSelectRegion: (cb) => ipcRenderer.on('select-region', () => cb()),
  onPickWindow: (cb) => ipcRenderer.on('pick-window', () => cb()),
});
