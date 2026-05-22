// CommonJS preload — bridges launcher.html to the main process via IPC.
// .cjs extension ensures it is treated as CommonJS regardless of package "type":"module".
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  hostGame: ()         => ipcRenderer.send('launcher-choice', { mode: 'host' }),
  joinGame: (ip, port) => ipcRenderer.send('launcher-choice', { mode: 'join', ip, port }),
});
