import { create } from 'zustand';
import { Formato, Nodo, CuentaContable, GrupoCuentas, CentroCosto, Departamento } from '../types';
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
  gruposCuentas: GrupoCuentas[];
  centrosCosto: CentroCosto[];
  centrosCostoDefault: string[];
  departamentos: Departamento[];
  departamentosDefault: string[];
  // Acciones de Formatos
  agregarFormato: (formato: string | Formato) => void;
  eliminarFormato: (id: string) => void;
  seleccionarFormato: (id: string) => void;
  actualizarFormato: (id: string, nombre: string) => void;
  actualizarFormatoDefaults: (id: string, centrosCostoDefault?: string[], departamentosDefault?: string[]) => void;
  agregarNodo: (parentId: string | null, tipo: 'grupo' | 'cuenta' | 'medida', cuenta?: CuentaContable, centrosCosto?: string[], departamentos?: string[]) => void;
  agregarNodoGrupoCuentas: (parentId: string | null, grupoCuentas: GrupoCuentas) => void;
  actualizarNodo: (id: string, datos: Partial<Nodo>) => void;
  eliminarNodo: (id: string) => void;
  moverNodo: (id: string, nuevoParentId: string | null, indice: number) => void;
  // Acciones de Catálogo
  agregarCuenta: (cuenta: CuentaContable) => void;
  actualizarCuenta: (id: string, cuenta: CuentaContable) => void;
  eliminarCuenta: (id: string) => void;
  // Acciones de Grupos de Cuentas
  agregarGrupoCuentas: (grupo: GrupoCuentas) => void;
  actualizarGrupoCuentas: (id: string, grupo: GrupoCuentas) => void;
  eliminarGrupoCuentas: (id: string) => void;
  // Acciones de Centros de Costo
  agregarCentroCosto: (centro: CentroCosto) => void;
  actualizarCentroCosto: (id: string, centro: CentroCosto) => void;
  eliminarCentroCosto: (id: string) => void;
  eliminarTodosCentrosCosto: () => void;
  // Acciones de Departamentos
  agregarDepartamento: (depto: Departamento) => void;
  actualizarDepartamento: (id: number, depto: Departamento) => void;
  eliminarDepartamento: (id: number) => void;
  eliminarTodosDepartamentos: () => void;
}

// Variable para hacer referencia al store
let storeInstance: ReturnType<typeof createStore> | null = null;

// Función para inicializar el store
const initializeStore = async () => {
  // Cargar datos del store de Electron
  const electronAPI = (window as any).electronAPI;
  if (electronAPI && storeInstance) {
    try {
      // Cargar datos de manera asíncrona
      const [formatos, formatoActual, cuentas, gruposCuentas, centrosCosto, centrosCostoDefault, departamentos, departamentosDefault] = await Promise.all([
        electronAPI.store.get('formatos'),
        electronAPI.store.get('formatoActual'),
        electronAPI.store.get('cuentas'),
        electronAPI.store.get('gruposCuentas'),
        electronAPI.store.get('centrosCosto'),
        electronAPI.store.get('centrosCostoDefault'),
        electronAPI.store.get('departamentos'),
        electronAPI.store.get('departamentosDefault')
      ]);

      // Asignar valores o defaults si son nulos
      const formatosGuardados = formatos || [];
      const formatoActualGuardado = formatoActual || null;
      const cuentasGuardadas = cuentas || [];
      const gruposCuentasGuardados = gruposCuentas || [];
      const centrosCostoGuardados = centrosCosto || [];
      const centrosCostoDefaultGuardados = centrosCostoDefault || [];
      const departamentosGuardados = departamentos || [];
      const departamentosDefaultGuardados = departamentosDefault || [];

      // Actualizar el store con los datos cargados
      storeInstance.setState({
        formatos: formatosGuardados,
        formatoActual: formatoActualGuardado,
        cuentas: cuentasGuardadas,
        gruposCuentas: gruposCuentasGuardados,
        centrosCosto: centrosCostoGuardados,
        centrosCostoDefault: centrosCostoDefaultGuardados,
        departamentos: departamentosGuardados,
        departamentosDefault: departamentosDefaultGuardados
      });
    } catch (error) {
      console.error('Error al cargar datos desde electron-store:', error);
    }
  }
};

// Función para crear el store
const createStore = () => create<AppState>((set) => ({
  formatos: [],
  formatoActual: null,
  cuentas: [],
  gruposCuentas: [],
  centrosCosto: [],
  centrosCostoDefault: [],
  departamentos: [],
  departamentosDefault: [],

  // Acciones de Formatos
  agregarFormato: (formato: string | Formato) => {
    let nuevoFormato: Formato;
    
    if (typeof formato === 'string') {
      // Si se pasa un string, crear un nuevo formato con ese nombre
      nuevoFormato = {
        id: uuidv4(),
        nombre: formato,
        estructura: [],
        centrosCostoDefault: [],
        departamentosDefault: []
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
      const electronAPI = (window as any).electronAPI;
      if (electronAPI) {
        electronAPI.store.set('formatos', newState.formatos);
        electronAPI.store.set('formatoActual', newState.formatoActual);
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
      
      if ((window as any).electronAPI) {
        (window as any).electronAPI.store.set('formatos', newState.formatos);
      }
      
      return newState;
    });
  },

  actualizarFormatoDefaults: (id, centrosCostoDefault, departamentosDefault) => {
    set((state) => {
      const newState = {
        ...state,
        formatos: state.formatos.map(formato => {
          if (formato.id === id) {
            const updates: Partial<Formato> = {};
            if (centrosCostoDefault !== undefined) {
              updates.centrosCostoDefault = centrosCostoDefault;
            }
            if (departamentosDefault !== undefined) {
              updates.departamentosDefault = departamentosDefault;
            }
            return { ...formato, ...updates };
          }
          return formato;
        })
      };
      
      if ((window as any).electronAPI) {
        (window as any).electronAPI.store.set('formatos', newState.formatos);
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
      (window as any).electronAPI?.store.set('formatos', newState.formatos);
      (window as any).electronAPI?.store.set('formatoActual', newState.formatoActual);
      return newState;
    });
  },

  seleccionarFormato: (id) => {
    set((state) => {
      const newState = { ...state, formatoActual: id };
      (window as any).electronAPI?.store.set('formatoActual', id);
      return newState;
    });
  },

  agregarNodo: (parentId, tipo, cuenta?: CuentaContable, centrosCosto?: string[], departamentos?: string[]) => {
    set((state) => {
      // Filtrar los centros de costo para asegurar que solo se incluyan idNetsuite válidos
      const centrosCostoValidos = centrosCosto?.filter(id => {
        // Verificar que sea un idNetsuite válido en la lista de centros de costo
        return state.centrosCosto.some(c => c.idNetsuite === id);
      }) || [];

      const departamentosValidos = departamentos?.filter(id => {
        // Verificar que sea un id válido en la lista de departamentos (por id o idNetsuite)
        return state.departamentos.some(d => d.idNetsuite === id || String(d.id) === id);
      }) || [];

      const nuevoNodo: Nodo = {
        id: uuidv4(),
        tipo,
        nombre: tipo === 'grupo' ? 'Nuevo Grupo' : 
                tipo === 'cuenta' ? (cuenta?.nombre || 'Nueva Cuenta') : 
                'Nueva Medida',
        cuenta: tipo === 'cuenta' ? cuenta : undefined,
        cuentaId: cuenta?.id || undefined,
        hijos: [],
        centrosCosto: (tipo === 'cuenta' || tipo === 'medida') ? centrosCostoValidos : [],
        departamentos: (tipo === 'cuenta' || tipo === 'medida') ? departamentosValidos : [],
        invertirValor: false
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

      (window as any).electronAPI?.store.set('formatos', newState.formatos);
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

      (window as any).electronAPI?.store.set('formatos', newState.formatos);
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

      (window as any).electronAPI?.store.set('formatos', newState.formatos);
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

      (window as any).electronAPI?.store.set('formatos', newState.formatos);
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
      (window as any).electronAPI?.store.set('cuentas', newState.cuentas);
      return newState;
    });
  },

  actualizarCuenta: (id, cuenta) => {
    set((state) => {
      const newState = {
        ...state,
        cuentas: state.cuentas.map(c => c.id === id ? cuenta : c)
      };
      (window as any).electronAPI?.store.set('cuentas', newState.cuentas);
      return newState;
    });
  },

  eliminarCuenta: (id: string) => {
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
        const usageDetails = {
          type: 'cuenta',
          itemName: state.cuentas.find(c => c.id === id)?.nombre || 'Cuenta desconocida',
          usedInFormats: informesUsandoCuenta.map(f => f.nombre),
          count: informesUsandoCuenta.length
        };
        const error = new Error(`La cuenta está siendo utilizada en ${informesUsandoCuenta.length} informe(s)`);
        (error as any).usageDetails = usageDetails;
        throw error;
      }

      // Solo eliminar la cuenta si no está en uso
      const newState = {
        ...state,
        cuentas: state.cuentas.filter(c => c.id !== id)
      };
      (window as any).electronAPI?.store.set('cuentas', newState.cuentas);
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
      (window as any).electronAPI?.store.set('centrosCosto', newState.centrosCosto);
      return newState;
    });
  },

  actualizarCentroCosto: (id, centro) => {
    set((state) => {
      const newState = {
        ...state,
        centrosCosto: state.centrosCosto.map(c => c.id === id ? centro : c)
      };
      (window as any).electronAPI?.store.set('centrosCosto', newState.centrosCosto);
      return newState;
    });
  },

  eliminarCentroCosto: (id) => {
    set((state) => {
      // Verificar si el centro de costo está siendo utilizado en algún informe
      const informesUsandoCentro = state.formatos.filter(formato => {
        const buscarCentroEnNodos = (nodos: Nodo[]): boolean => {
          for (const nodo of nodos) {
            if ((nodo.tipo === 'cuenta' || nodo.tipo === 'medida') && 
                nodo.centrosCosto && nodo.centrosCosto.includes(id)) {
              return true;
            }
            if (nodo.hijos && nodo.hijos.length > 0) {
              if (buscarCentroEnNodos(nodo.hijos)) {
                return true;
              }
            }
          }
          return false;
        };
        return buscarCentroEnNodos(formato.estructura);
      });

      if (informesUsandoCentro.length > 0) {
        const usageDetails = {
          type: 'centro',
          itemName: state.centrosCosto.find(c => c.id === id)?.nombre || 'Centro desconocido',
          usedInFormats: informesUsandoCentro.map(f => f.nombre),
          count: informesUsandoCentro.length
        };
        const error = new Error(`El centro de costo está siendo utilizado en ${informesUsandoCentro.length} informe(s)`);
        (error as any).usageDetails = usageDetails;
        throw error;
      }

      const newState = {
        ...state,
        centrosCosto: state.centrosCosto.filter(c => c.id !== id)
      };
      (window as any).electronAPI?.store.set('centrosCosto', newState.centrosCosto);
      return newState;
    });
  },

  eliminarTodosCentrosCosto: () => {
    set((state) => {
      const newState = {
        ...state,
        centrosCosto: []
      };
      (window as any).electronAPI?.store.set('centrosCosto', newState.centrosCosto);
      return newState;
    });
  },

  // Acciones de Departamentos
  agregarDepartamento: (depto) => {
    set((state) => {
      const newState = {
        ...state,
        departamentos: [...state.departamentos, depto]
      };
      (window as any).electronAPI?.store.set('departamentos', newState.departamentos);
      return newState;
    });
  },

  actualizarDepartamento: (id: number, depto: Departamento) => {
    set((state) => {
      const newState = {
        ...state,
        departamentos: state.departamentos.map(d => d.id === id ? depto : d)
      };
      (window as any).electronAPI?.store.set('departamentos', newState.departamentos);
      return newState;
    });
  },

  eliminarDepartamento: (id: number) => {
    set((state) => {
      // Verificar si el departamento está siendo utilizado en algún informe
      const informesUsandoDepto = state.formatos.filter(formato => {
        const buscarDeptoEnNodos = (nodos: Nodo[]): boolean => {
          for (const nodo of nodos) {
            if ((nodo.tipo === 'cuenta' || nodo.tipo === 'medida') && 
                nodo.departamentos && nodo.departamentos.includes(String(id))) {
              return true;
            }
            if (nodo.hijos && nodo.hijos.length > 0) {
              if (buscarDeptoEnNodos(nodo.hijos)) {
                return true;
              }
            }
          }
          return false;
        };
        return buscarDeptoEnNodos(formato.estructura);
      });

      if (informesUsandoDepto.length > 0) {
        const usageDetails = {
          type: 'departamento',
          itemName: state.departamentos.find(d => d.id === id)?.nombre || 'Departamento desconocido',
          usedInFormats: informesUsandoDepto.map(f => f.nombre),
          count: informesUsandoDepto.length
        };
        const error = new Error(`El departamento está siendo utilizado en ${informesUsandoDepto.length} informe(s)`);
        (error as any).usageDetails = usageDetails;
        throw error;
      }

      const newState = {
        ...state,
        departamentos: state.departamentos.filter(d => d.id !== id)
      };
      (window as any).electronAPI?.store.set('departamentos', newState.departamentos);
      return newState;
    });
  },

  eliminarTodosDepartamentos: () => {
    set((state) => {
      const newState = {
        ...state,
        departamentos: []
      };
      (window as any).electronAPI?.store.set('departamentos', newState.departamentos);
      return newState;
    });
  },

  // Acciones de Grupos de Cuentas
  agregarGrupoCuentas: (grupo) => {
    set((state) => {
      const newState = {
        ...state,
        gruposCuentas: [...state.gruposCuentas, grupo]
      };
      (window as any).electronAPI?.store.set('gruposCuentas', newState.gruposCuentas);
      return newState;
    });
  },

  actualizarGrupoCuentas: (id, grupo) => {
    set((state) => {
      const newState = {
        ...state,
        gruposCuentas: state.gruposCuentas.map(g => g.id === id ? grupo : g)
      };
      (window as any).electronAPI?.store.set('gruposCuentas', newState.gruposCuentas);
      return newState;
    });
  },

  eliminarGrupoCuentas: (id) => {
    set((state) => {
      const newState = {
        ...state,
        gruposCuentas: state.gruposCuentas.filter(g => g.id !== id)
      };
      (window as any).electronAPI?.store.set('gruposCuentas', newState.gruposCuentas);
      return newState;
    });
  },

  agregarNodoGrupoCuentas: (parentId, grupoCuentas) => {
    set((state) => {
      if (!state.formatoActual) return state;

      // Obtener las cuentas del grupo
      const cuentasDelGrupo = state.cuentas.filter(cuenta => 
        grupoCuentas.cuentas.includes(cuenta.id)
      );

      // Crear un nodo grupo para contener las cuentas
      const nodoGrupo: Nodo = {
        id: uuidv4(),
        tipo: 'grupo',
        nombre: grupoCuentas.nombre,
        hijos: [],
        centrosCosto: [],
        departamentos: [],
        invertirValor: false
      };

      // Crear nodos para cada cuenta del grupo con los centros de costo y departamentos por defecto
      const formatoActual = state.formatos.find(f => f.id === state.formatoActual);
      const centrosCostoDefault = formatoActual?.centrosCostoDefault || [];
      const departamentosDefault = formatoActual?.departamentosDefault || [];

      const nodosCuentas: Nodo[] = cuentasDelGrupo.map(cuenta => ({
        id: uuidv4(),
        tipo: 'cuenta' as const,
        nombre: cuenta.nombre,
        cuenta: cuenta,
        cuentaId: cuenta.id,
        hijos: [],
        centrosCosto: centrosCostoDefault,
        departamentos: departamentosDefault,
        invertirValor: false
      }));

      nodoGrupo.hijos = nodosCuentas;

      const actualizarNodos = (nodos: Nodo[]): Nodo[] => {
        if (!parentId) return [...nodos, nodoGrupo];

        return nodos.map(nodo => {
          if (nodo.id === parentId) {
            return {
              ...nodo,
              hijos: [...nodo.hijos, nodoGrupo]
            };
          }
          return {
            ...nodo,
            hijos: actualizarNodos(nodo.hijos)
          };
        });
      };

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

      (window as any).electronAPI?.store.set('formatos', newState.formatos);
      return newState;
    });
  }
}));

// Crear el store
export const useAppStore = createStore();

// Asignar la instancia para poder actualizarla después
storeInstance = useAppStore;

// Inicializar el store con los datos persistentes cuando la ventana esté lista
if (typeof window !== 'undefined') {
  // Esperar a que electronAPI esté disponible
  const waitForElectronAPI = () => {
    if ((window as any).electronAPI) {
      initializeStore();
    } else {
      setTimeout(waitForElectronAPI, 100);
    }
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForElectronAPI);
  } else {
    waitForElectronAPI();
  }
}