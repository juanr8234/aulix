const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';

function getDataPath() {
  const userData = app.getPath('userData');
  if (!fs.existsSync(userData)) fs.mkdirSync(userData, { recursive: true });
  return path.join(userData, 'aulix-data.json');
}

/** Migración silenciosa desde el archivo viejo gaul-data.json si existe. */
function getLegacyDataPath() {
  const userData = app.getPath('userData');
  return path.join(userData, 'gaul-data.json');
}

ipcMain.handle('storage:read', () => {
  try {
    const p = getDataPath();
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8');

    // Migrar del archivo legacy si existe
    const legacy = getLegacyDataPath();
    if (fs.existsSync(legacy)) {
      const raw = fs.readFileSync(legacy, 'utf-8');
      try { fs.writeFileSync(p, raw, 'utf-8'); } catch {}
      return raw;
    }
    return null;
  } catch (e) {
    console.error('storage:read error', e);
    return null;
  }
});

ipcMain.handle('storage:write', (_e, payload) => {
  try {
    fs.writeFileSync(getDataPath(), payload, 'utf-8');
    return true;
  } catch (e) {
    console.error('storage:write error', e);
    return false;
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0a0e1a',
    title: 'Aulix',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
