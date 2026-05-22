import { app, BrowserWindow, Menu } from 'electron';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { startServer } from '../server/server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let win = null;
let serverPort = null;

// Single-instance guard
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.whenReady().then(async () => {
  let port = 3000;
  let localIP = '127.0.0.1';

  try {
    ({ port, localIP } = await startServer(port));
  } catch (err) {
    // Port likely in use — try one more time on next port
    try {
      ({ port, localIP } = await startServer(port + 1));
    } catch (err2) {
      console.error('[Electron] Could not start server:', err2.message);
      app.quit();
      return;
    }
  }

  serverPort = port;
  Menu.setApplicationMenu(null);

  win = new BrowserWindow({
    width: 1300,
    height: 780,
    minWidth: 800,
    minHeight: 500,
    title: `Democracy The Game  ·  P2 joins: ${localIP}:${port}`,
    backgroundColor: '#0A0A1A',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  win.loadURL(`http://localhost:${port}`);
  win.on('closed', () => { win = null; });
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (!win && serverPort) {
    win = new BrowserWindow({
      width: 1300, height: 780,
      title: 'Democracy The Game',
      backgroundColor: '#0A0A1A',
      webPreferences: { nodeIntegration: false, contextIsolation: true },
      autoHideMenuBar: true,
    });
    Menu.setApplicationMenu(null);
    win.loadURL(`http://localhost:${serverPort}`);
    win.on('closed', () => { win = null; });
  }
});
