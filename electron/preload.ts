const { contextBridge, ipcRenderer } = require('electron');

// Los tipos están definidos en types.d.ts
const electronAPI = {
  getStorePath: () => ipcRenderer.invoke('get-store-path'),
  store: {
    get: (key) => ipcRenderer.invoke('store-get', key),
    set: (key, value) => 
      ipcRenderer.invoke('store-set', key, value).then((result) => !!result),
    delete: (key) => 
      ipcRenderer.invoke('store-delete', key).then((result) => !!result),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);