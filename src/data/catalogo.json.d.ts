import { CuentaContable } from '../types';

declare module '../data/catalogo.json' {
  const catalogo: {
    cuentas: CuentaContable[];
  };
  export default catalogo;
} 