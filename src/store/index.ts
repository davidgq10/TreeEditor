import { create } from 'zustand';
import { Formato, Nodo, CuentaContable, CentroCosto } from '../types';
import { v4 as uuidv4 } from 'uuid';

declare global {
  interface Window {
    electronAPI: {
      store: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<void>;
        delete: (key: string) => Promise<void>;
      };
    };
  }
}

interface AppState {
  formatos: Formato[];
  formatoActual: string | null;
  cuentas: CuentaContable[];
  centrosCosto: CentroCosto[];
  centrosCostoDefault: string[];
  // Acciones de Formatos
  agregarFormato: (formato: string | Formato) => void;
  eliminarFormato: (id: string) => void;
  seleccionarFormato: (id: string) => void;
  actualizarFormato: (id: string, nombre: string) => void;
  agregarNodo: (parentId: string | null, tipo: 'grupo' | 'cuenta', cuenta?: CuentaContable, centrosCosto?: string[]) => void;
  actualizarNodo: (id: string, datos: Partial<Nodo>) => void;
  eliminarNodo: (id: string) => void;
  moverNodo: (id: string, nuevoParentId: string | null, indice: number) => void;
  // Acciones de Catálogo
  agregarCuenta: (cuenta: CuentaContable) => void;
  actualizarCuenta: (id: string, cuenta: CuentaContable) => void;
  eliminarCuenta: (id: string) => void;
  // Acciones de Centros de Costo
  agregarCentroCosto: (centro: CentroCosto) => void;
  actualizarCentroCosto: (id: string, centro: CentroCosto) => void;
  eliminarCentroCosto: (id: string) => void;
}

// Función para inicializar el store
const initializeStore = async () => {
  let formatosGuardados: Formato[] = [];
  let formatoActualGuardado: string | null = null;
  let cuentasGuardadas: CuentaContable[] = [];
  let centrosCostoGuardados: CentroCosto[] = [];
  let centrosCostoDefaultGuardados: string[] = [];

  // Cargar datos del store de Electron
  if (window.electronAPI) {
    try {
      // Cargar datos de manera asíncrona
      const [formatos, formatoActual, cuentas, centrosCosto, centrosCostoDefault] = await Promise.all([
        window.electronAPI.store.get('formatos'),
        window.electronAPI.store.get('formatoActual'),
        window.electronAPI.store.get('cuentas'),
        window.electronAPI.store.get('centrosCosto'),
        window.electronAPI.store.get('centrosCostoDefault')
      ]);

      // Asignar valores o defaults si son nulos
      formatosGuardados = formatos || [];
      formatoActualGuardado = formatoActual || null;
      cuentasGuardadas = cuentas || [];
      centrosCostoGuardados = centrosCosto || [];
      centrosCostoDefaultGuardados = centrosCostoDefault || [];

      // Actualizar el store con los datos cargados
      if (storeInstance) {
        storeInstance.setState({
          formatos: formatosGuardados,
          formatoActual: formatoActualGuardado,
          cuentas: cuentasGuardadas,
          centrosCosto: centrosCostoGuardados,
          centrosCostoDefault: centrosCostoDefaultGuardados
        });
      }
    } catch (error) {
      console.error('Error al cargar datos desde electron-store:', error);
    }
  }

  return {
    formatosGuardados,
    formatoActualGuardado,
    cuentasGuardadas,
    centrosCostoGuardados,
    centrosCostoDefaultGuardados
  };
};

// Inicializar con valores vacíos por defecto
let {
  formatosGuardados,
  formatoActualGuardado,
  cuentasGuardadas,
  centrosCostoGuardados,
  centrosCostoDefaultGuardados
} = {
  formatosGuardados: [],
  formatoActualGuardado: null,
  cuentasGuardadas: [],
  centrosCostoGuardados: [],
  centrosCostoDefaultGuardados: []
};

// Variable para hacer referencia al store
let storeInstance: ReturnType<typeof createStore> | null = null;

// Función para crear el store
const createStore = () => create<AppState>((set) => ({
  formatos: formatosGuardados,
  formatoActual: formatoActualGuardado,
  cuentas: cuentasGuardadas,
  centrosCosto: centrosCostoGuardados,
  centrosCostoDefault: centrosCostoDefaultGuardados,

  // Acciones de Formatos
  agregarFormato: (formato: string | Formato) => {
    let nuevoFormato: Formato;
    
    if (typeof formato === 'string') {
      // Si se pasa un string, crear un nuevo formato con ese nombre
      nuevoFormato = {
        id: uuidv4(),
        nombre: formato,
        estructura: [],
        centrosCostoDefault: []
      };
    } else {
      // Si se pasa un objeto Formato, usarlo directamente
      nuevoFormato = {
        ...formato,
        id: formato.id || uuidv4()
      };
    }
    
    set((state) => {
      const newState = {
        formatos: [...state.formatos, nuevoFormato],
        formatoActual: nuevoFormato.id
      };
      
      // Guardar en el store de Electron si está disponible
      if (window.electronAPI) {
        window.electronAPI.store.set('formatos', newState.formatos);
        window.electronAPI.store.set('formatoActual', newState.formatoActual);
      }
      
      return newState;
    });
  },

  actualizarFormato: (id, nombre) => {
    set((state) => {
      const newState = {
        ...state,
        formatos: state.formatos.map(formato => 
          formato.id === id ? { ...formato, nombre } : formato
        )
      };
      
      if (window.electronAPI) {
        window.electronAPI.store.set('formatos', newState.formatos);
      }
      
      return newState;
    });
  },

  eliminarFormato: (id) => {
    set((state) => {
      const newState = {
        formatos: state.formatos.filter(f => f.id !== id),
        formatoActual: state.formatoActual === id ? null : state.formatoActual
      };
      window.electronAPI?.store.set('formatos', newState.formatos);
      window.electronAPI?.store.set('formatoActual', newState.formatoActual);
      return newState;
    });
  },

  seleccionarFormato: (id) => {
    set((state) => {
      const newState = { ...state, formatoActual: id };
      window.electronAPI?.store.set('formatoActual', id);
      return newState;
    });
  },

  agregarNodo: (parentId, tipo, cuenta?: CuentaContable, centrosCosto?: string[]) => {
    set((state) => {
      const nuevoNodo: Nodo = {
        id: uuidv4(),
        tipo,
        nombre: tipo === 'grupo' ? 'Nuevo Grupo' : cuenta?.nombre || 'Nueva Cuenta',
        cuenta: tipo === 'cuenta' ? cuenta : undefined,
        hijos: [],
        centrosCosto: centrosCosto || []
      };

      const actualizarNodos = (nodos: Nodo[]): Nodo[] => {
        if (!parentId) return [...nodos, nuevoNodo];

        return nodos.map(nodo => {
          if (nodo.id === parentId) {
            return {
              ...nodo,
              hijos: [...nodo.hijos, nuevoNodo]
            };
          }
          return {
            ...nodo,
            hijos: actualizarNodos(nodo.hijos)
          };
        });
      };

      if (!state.formatoActual) return state;

      const newState = {
        ...state,
        formatos: state.formatos.map(formato => {
          if (formato.id === state.formatoActual) {
            return {
              ...formato,
              estructura: actualizarNodos(formato.estructura)
            };
          }
          return formato;
        })
      };

      window.electronAPI?.store.set('formatos', newState.formatos);
      return newState;
    });
  },

  actualizarNodo: (id, datos) => {
    set((state) => {
      const actualizarNodos = (nodos: Nodo[]): Nodo[] => {
        return nodos.map(nodo => {
          if (nodo.id === id) {
            return { ...nodo, ...datos };
          }
          return {
            ...nodo,
            hijos: actualizarNodos(nodo.hijos)
          };
        });
      };

      if (!state.formatoActual) return state;

      const newState = {
        ...state,
        formatos: state.formatos.map(formato => {
          if (formato.id === state.formatoActual) {
            return {
              ...formato,
              estructura: actualizarNodos(formato.estructura)
            };
          }
          return formato;
        })
      };

      window.electronAPI?.store.set('formatos', newState.formatos);
      return newState;
    });
  },

  eliminarNodo: (id) => {
    set((state) => {
      const eliminarDeNodos = (nodos: Nodo[]): Nodo[] => {
        return nodos
          .filter(nodo => nodo.id !== id)
          .map(nodo => ({
            ...nodo,
            hijos: eliminarDeNodos(nodo.hijos)
          }));
      };

      if (!state.formatoActual) return state;

      const newState = {
        ...state,
        formatos: state.formatos.map(formato => {
          if (formato.id === state.formatoActual) {
            return {
              ...formato,
              estructura: eliminarDeNodos(formato.estructura)
            };
          }
          return formato;
        })
      };

      window.electronAPI?.store.set('formatos', newState.formatos);
      return newState;
    });
  },

  moverNodo: (id, nuevoParentId, indice) => {
    set((state) => {
      let nodoAMover: Nodo | null = null;

      const eliminarNodoOriginal = (nodos: Nodo[]): Nodo[] => {
        return nodos.reduce<Nodo[]>((acc, nodo) => {
          if (nodo.id === id) {
            nodoAMover = { ...nodo };
            return acc;
          }
          return [...acc, {
            ...nodo,
            hijos: eliminarNodoOriginal(nodo.hijos)
          }];
        }, []);
      };

      const insertarNodo = (nodos: Nodo[]): Nodo[] => {
        if (!nodoAMover) return nodos;

        if (!nuevoParentId) {
          const nuevosNodos = [...nodos];
          nuevosNodos.splice(indice, 0, nodoAMover);
          return nuevosNodos;
        }

        return nodos.map(nodo => {
          if (nodo.id === nuevoParentId) {
            const nuevosHijos = [...nodo.hijos];
            nuevosHijos.splice(indice, 0, nodoAMover as Nodo);
            return { ...nodo, hijos: nuevosHijos };
          }
          return {
            ...nodo,
            hijos: insertarNodo(nodo.hijos)
          };
        });
      };

      if (!state.formatoActual) return state;

      const formatoActual = state.formatos.find(f => f.id === state.formatoActual);
      if (!formatoActual) return state;

      const estructuraSinNodo = eliminarNodoOriginal(formatoActual.estructura);
      const nuevaEstructura = insertarNodo(estructuraSinNodo);

      const newState = {
        ...state,
        formatos: state.formatos.map(formato => {
          if (formato.id === state.formatoActual) {
            return {
              ...formato,
              estructura: nuevaEstructura
            };
          }
          return formato;
        })
      };

      window.electronAPI?.store.set('formatos', newState.formatos);
      return newState;
    });
  },

  // Acciones de Catálogo
  agregarCuenta: (cuenta) => {
    set((state) => {
      const newState = {
        ...state,
        cuentas: [...state.cuentas, cuenta]
      };
      window.electronAPI?.store.set('cuentas', newState.cuentas);
      return newState;
    });
  },

  actualizarCuenta: (id, cuenta) => {
    set((state) => {
      const newState = {
        ...state,
        cuentas: state.cuentas.map(c => c.id === id ? cuenta : c)
      };
      window.electronAPI?.store.set('cuentas', newState.cuentas);
      return newState;
    });
  },

  eliminarCuenta: (id) => {
    set((state) => {
      // Verificar si la cuenta está siendo utilizada en algún informe
      const informesUsandoCuenta = state.formatos.filter(formato => {
        const buscarCuentaEnNodos = (nodos: Nodo[]): boolean => {
          for (const nodo of nodos) {
            if (nodo.tipo === 'cuenta' && (nodo.cuentaId === id || nodo.cuenta?.id === id)) {
              return true;
            }
            if (nodo.hijos && nodo.hijos.length > 0) {
              if (buscarCuentaEnNodos(nodo.hijos)) {
                return true;
              }
            }
          }
          return false;
        };
        return buscarCuentaEnNodos(formato.estructura);
      });

      if (informesUsandoCuenta.length > 0) {
        throw new Error(`La cuenta está siendo utilizada en ${informesUsandoCuenta.length} informe(s)`);
      }

      // Solo eliminar la cuenta si no está en uso
      const newState = {
        ...state,
        cuentas: state.cuentas.filter(c => c.id !== id)
      };
      window.electronAPI?.store.set('cuentas', newState.cuentas);
      return newState;
    });
  },

  // Acciones de Centros de Costo
  agregarCentroCosto: (centro) => {
    set((state) => {
      const newState = {
        ...state,
        centrosCosto: [...state.centrosCosto, centro]
      };
      window.electronAPI?.store.set('centrosCosto', newState.centrosCosto);
      return newState;
    });
  },

  actualizarCentroCosto: (id, centro) => {
    set((state) => {
      const newState = {
        ...state,
        centrosCosto: state.centrosCosto.map(c => c.id === id ? centro : c)
      };
      window.electronAPI?.store.set('centrosCosto', newState.centrosCosto);
      return newState;
    });
  },

  eliminarCentroCosto: (id) => {
    set((state) => {
      const newState = {
        ...state,
        centrosCosto: state.centrosCosto.filter(c => c.id !== id)
      };
      window.electronAPI?.store.set('centrosCosto', newState.centrosCosto);
      return newState;
    });
  }
}));

// Crear el store
export const useAppStore = createStore();

// Asignar la instancia para poder actualizarla después
storeInstance = useAppStore;

// Inicializar el store con los datos persistentes
initializeStore();