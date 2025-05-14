const { contextBridge, ipcRenderer } = require('electron');

// Los tipos están definidos en types.d.ts
const electronAPI = {
  store: {
    get: (key: string): Promise<any> => ipcRenderer.invoke('store-get', key),
    set: (key: string, value: any): Promise<boolean> => 
      ipcRenderer.invoke('store-set', key, value).then((result: any) => !!result),
    delete: (key: string): Promise<boolean> => 
      ipcRenderer.invoke('store-delete', key).then((result: any) => !!result),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);