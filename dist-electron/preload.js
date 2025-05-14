const { contextBridge, ipcRenderer } = require("electron");
const electronAPI = {
  store: {
    get: (key) => ipcRenderer.invoke("store-get", key),
    set: (key, value) => ipcRenderer.invoke("store-set", key, value).then((result) => !!result),
    delete: (key) => ipcRenderer.invoke("store-delete", key).then((result) => !!result)
  }
};
contextBridge.exposeInMainWorld("electronAPI", electronAPI);
//# sourceMappingURL=preload.js.map
