import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { startServer } from '../server/server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let launcherWin = null;
let gameWin = null;

// Single-instance guard
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}
app.on('second-instance', () => {
  const w = gameWin || launcherWin;
  if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
});

function openGameWindow(url, title) {
  Menu.setApplicationMenu(null);
  gameWin = new BrowserWindow({
    width: 1300, height: 780,
    minWidth: 800, minHeight: 500,
    title,
    backgroundColor: '#0A0A1A',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    autoHideMenuBar: true,
  });
  gameWin.loadURL(url);
  gameWin.on('closed', () => { gameWin = null; });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  // ── Launcher window ──────────────────────────────────────────────────────
  launcherWin = new BrowserWindow({
    width: 340, height: 260,
    resizable: false,
    title: 'Democracy The Game',
    backgroundColor: '#0A0A1A',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.cjs'),
    },
    autoHideMenuBar: true,
  });
  launcherWin.loadFile(join(__dirname, 'launcher.html'));
  launcherWin.on('closed', () => {
    launcherWin = null;
    if (!gameWin) app.quit();
  });

  // ── Handle launcher choice ───────────────────────────────────────────────
  ipcMain.once('launcher-choice', async (_event, { mode, ip, port }) => {
    if (mode === 'host') {
      let serverPort = 3000;
      let localIP = '127.0.0.1';
      try {
        ({ port: serverPort, localIP } = await startServer(3000));
      } catch {
        try {
          ({ port: serverPort, localIP } = await startServer(3001));
        } catch (err) {
          console.error('[Electron] Server failed to start:', err.message);
          app.quit();
          return;
        }
      }
      launcherWin?.close();
      openGameWindow(
        `http://localhost:${serverPort}`,
        `Democracy The Game  ·  P2 joins: ${localIP}:${serverPort}`,
      );
    } else {
      // Join mode — open straight to host's server, no local server started
      launcherWin?.close();
      openGameWindow(
        `http://${ip}:${port}`,
        `Democracy The Game  ·  Connected to ${ip}:${port}`,
      );
    }
  });
});

app.on('window-all-closed', () => app.quit());
