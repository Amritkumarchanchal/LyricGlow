const { app, BrowserWindow, desktopCapturer, globalShortcut, ipcMain, Menu, screen, systemPreferences } = require('electron');
const path = require('path');

app.setName('LyricGlow');

let win = null;
let clickThrough = false;

function createApplicationMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'LyricGlow',
      submenu: [
        { label: 'Show LyricGlow', click: () => win?.show() },
        { role: 'hide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'close' }],
    },
  ]));
}

function createWindow() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width: 560,
    height: 140,
    x: Math.round((width - 560) / 2),
    y: 40,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Stay above full-screen apps and follow you across Spaces.
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.loadFile('index.html');
}

function toggleClickThrough() {
  clickThrough = !clickThrough;
  // forward: true keeps mouse-move events flowing so the UI can react.
  win.setIgnoreMouseEvents(clickThrough, { forward: true });
  win.webContents.send('click-through', clickThrough);
}

app.whenReady().then(async () => {
  // Triggers the macOS Screen Recording permission prompt if needed.
  if (process.platform === 'darwin') {
    app.dock.show();
    createApplicationMenu();
    const status = systemPreferences.getMediaAccessStatus('screen');
    console.log('Screen recording permission:', status);
  }

  createWindow();

  globalShortcut.register('CommandOrControl+Shift+L', () => {
    if (win.isVisible()) win.hide();
    else win.showInactive();
  });
  globalShortcut.register('CommandOrControl+Shift+K', toggleClickThrough);
  globalShortcut.register('CommandOrControl+Shift+R', () => win.webContents.send('select-region'));
  globalShortcut.register('CommandOrControl+Shift+W', () => win.webContents.send('pick-window'));
});

app.on('activate', () => {
  if (!win) createWindow();
  else win.show();
});

ipcMain.handle('get-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['window'],
    thumbnailSize: { width: 0, height: 0 },
  });
  return sources
    .filter((s) => s.name && s.name !== win.getTitle())
    .map((s) => ({ id: s.id, name: s.name }));
});

ipcMain.handle('screen-permission', () => {
  if (process.platform !== 'darwin') return 'granted';
  return systemPreferences.getMediaAccessStatus('screen');
});

ipcMain.handle('get-open-at-login', () => ({
  supported: process.platform === 'darwin',
  enabled: process.platform === 'darwin' && app.getLoginItemSettings().openAtLogin,
}));

ipcMain.handle('set-open-at-login', (_event, enabled) => {
  if (process.platform !== 'darwin') return false;
  app.setLoginItemSettings({ openAtLogin: Boolean(enabled) });
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.on('quit', () => app.quit());

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
