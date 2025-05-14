// @ts-check
import { app, BrowserWindow, ipcMain, session } from 'electron';
import * as path from 'path';
import Store from 'electron-store';

// Import Electron's type for IpcMainInvokeEvent
import type { HeadersReceivedResponse, OnHeadersReceivedListenerDetails } from 'electron';

// Type for the callback function
type HeadersReceivedCallback = (response: HeadersReceivedResponse) => void;

// Obtener la ruta del directorio actual
const appPath = app.getAppPath();
const isDev = process.env.NODE_ENV === 'development';

// Inicializar el store de Electron
const store = new Store();



function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(appPath, 'dist-electron/preload.js'),
      sandbox: true,
      webSecurity: true
    },
    autoHideMenuBar: true,
    show: false
  });

  // Configurar CSP
  session.defaultSession.webRequest.onHeadersReceived(
    (details: OnHeadersReceivedListenerDetails, callback: HeadersReceivedCallback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data:; " +
            "font-src 'self' data:; " +
            "connect-src 'self' http://localhost:*"
          ]
        }
      });
    }
  );

  mainWindow.maximize();
  mainWindow.show();

  if (isDev) {
    const devServerUrl = 'http://localhost:5173';
    mainWindow.loadURL(devServerUrl).catch((err: Error) => {
      console.error('Failed to load dev server:', err);
    });
    console.log('Development server running at:', devServerUrl);
  } else {
    const indexPath = path.join(appPath, 'dist/index.html');
    mainWindow.loadFile(indexPath).catch((err: Error) => {
      console.error('Failed to load index.html:', err);
    });
  }

  // Abrir herramientas de desarrollo solo en desarrollo
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  return mainWindow;
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers para la persistencia de datos
ipcMain.handle('store-get', (event: Electron.IpcMainInvokeEvent, key: string) => {
  return store.get(key);
});

ipcMain.handle('store-set', (event: Electron.IpcMainInvokeEvent, key: string, value: any) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('store-delete', (event: Electron.IpcMainInvokeEvent, key: string) => {
  store.delete(key);
  return true;
});
