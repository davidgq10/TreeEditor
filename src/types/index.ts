export type Nodo = {
  id: string;
  tipo: 'grupo' | 'cuenta' | 'medida';
  nombre: string;
  cuenta?: CuentaContable;
  cuentaId?: string;
  hijos: Nodo[];
  centrosCosto: string[];
  invertirValor?: boolean;
};

export type Formato = {
  id: string;
  nombre: string;
  estructura: Nodo[];
  centrosCostoDefault: string[];
};

export type CuentaContable = {
  id: string;
  codigo: string;
  nombre: string;
  naturaleza: 'gasto' | 'ingreso';
};

export type PreviewData = {
  formatoId: string;
  datos: {
    [cuentaId: string]: number;
  };
};

export interface CentroCosto {
  id: string;
  nombre: string;
  tipo: string;
  idNetsuite?: string;
}

export interface AppState {
  formatos: Formato[];
  formatoActual: string | null;
  cuentas: CuentaContable[];
  centrosCosto: CentroCosto[];
  centrosCostoDefault: string[];
  // Acciones de Formatos
  agregarFormato: (nombre: string) => void;
  eliminarFormato: (id: string) => void;
  seleccionarFormato: (id: string) => void;
  actualizarFormato: (id: string, nombre: string) => void;
  agregarNodo: (parentId: string | null, tipo: 'grupo' | 'cuenta' | 'medida', cuenta?: CuentaContable, centrosCosto?: string[]) => void;
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