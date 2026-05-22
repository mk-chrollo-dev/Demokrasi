// Electron entry point — STUB. Wire up after LAN server is working end-to-end.
//
// Integration options:
//   Option A (simple):  spawn server/server.js as a child_process, then open
//                       BrowserWindow to http://localhost:3000
//   Option B (cleaner): import startServer() from server/server.js directly
//                       in the main process (no child process management).
//                       server.js already exports startServer().
//
// Option B is preferred — use it when Electron integration begins.

import { app } from 'electron';

app.whenReady().then(() => {
  console.log('[Electron] Stub — server + BrowserWindow not yet wired.');
  console.log('[Electron] Run `npm start` to use the LAN server directly.');
});

/*
// ── OPTION B implementation (uncomment when ready) ──────────────────────────
import { app, BrowserWindow } from 'electron'
import { startServer } from '../server/server.js'

let win

app.whenReady().then(async () => {
  const { port } = await startServer()

  win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  })

  win.loadURL(`http://localhost:${port}`)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
*/
