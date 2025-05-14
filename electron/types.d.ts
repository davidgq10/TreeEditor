// Tipos para el preload
declare global {
  interface Window {
    electronAPI: {
      store: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<boolean>;
        delete: (key: string) => Promise<boolean>;
      };
    };
  }
}

export {};
