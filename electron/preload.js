const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gitDict', {
  // копирование через IPC → clipboard.writeText (plain text, UTF-8)
  copyText: (text) => ipcRenderer.invoke('clipboard:writeText', text),
  platform: process.platform,
});
