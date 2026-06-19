const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aulix', {
  storage: {
    read: () => ipcRenderer.invoke('storage:read'),
    write: (payload) => ipcRenderer.invoke('storage:write', payload),
  },
});
