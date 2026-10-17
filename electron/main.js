const { app, BrowserWindow, ipcMain, clipboard, shell } = require('electron');
const path = require('path');

const isDev = process.argv.includes('--dev');

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0b0f17',
    title: 'Git Dictionary — справочник команд Git',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // внешние ссылки — в системный браузер, не в окно приложения
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    // win.webContents.openDevTools({ mode: 'detach' }); // при необходимости
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  return win;
}

app.whenReady().then(() => {
  // Копирование из главного процесса: clipboard.writeText кладёт в буфер
  // ТОЛЬКО чистый текст (UTF-8) — без HTML/RTF-разметки.
  ipcMain.handle('clipboard:writeText', (_event, text) => {
    clipboard.writeText(String(text ?? ''));
    return true;
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
