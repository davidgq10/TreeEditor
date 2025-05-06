import ExcelJS from 'exceljs';
import { Formato, Nodo, CuentaContable, CentroCosto } from '../types';

interface ExportOptions {
  formato: Formato;
  datos: { [cuentaId: string]: number };
  centrosCostoList?: CentroCosto[]; // Opcional, para mostrar nombres
}

export async function exportarAExcel({ formato, datos, centrosCostoList = [] }: ExportOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('FormatoInforme');

  // Función para obtener la profundidad máxima del árbol
  const obtenerProfundidadMaxima = (nodos: Nodo[], nivel = 0): number => {
    let maxProfundidad = nivel;
    nodos.forEach(nodo => {
      if (nodo.hijos.length > 0) {
        const profundidadHijos = obtenerProfundidadMaxima(nodo.hijos, nivel + 1);
        maxProfundidad = Math.max(maxProfundidad, profundidadHijos);
      }
    });
    return maxProfundidad;
  };

  // Obtener la profundidad máxima del árbol
  const profundidadMaxima = obtenerProfundidadMaxima(formato.estructura) + 1;

  // Configurar columnas dinámicamente
  worksheet.columns = [
    { header: 'Nombre del informe', key: 'nombreInforme', width: 30 },
    ...Array.from({ length: profundidadMaxima }, (_, i) => ({
      header: `Nivel ${i + 1}`,
      key: `nivel${i + 1}`,
      width: 30
    })),
    { header: 'Centro de costo seleccionados', key: 'centrosCostoIds', width: 30 },
    { header: 'Nombres de centro de costo seleccionados', key: 'centrosCostoNombres', width: 40 },
    { header: 'Invertir valor', key: 'invertirValor', width: 15 },
    { header: 'Orden global de linea en informe', key: 'ordenGlobal', width: 15 },
    { header: 'Numero de Cuenta', key: 'numeroCuenta', width: 20 },
    { header: 'Nombre de Cuenta', key: 'nombreCuenta', width: 30 },
    { header: 'Tipo de Cuenta', key: 'tipoCuenta', width: 20 },
    { header: 'Descripción completa', key: 'descripcionCompleta', width: 40 },
    { header: 'Es Linea de Informe', key: 'esLineaInforme', width: 15 }
  ];

  // Estilo para encabezados
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF000000' }
  };

  let ordenGlobal = 1;
  // Función recursiva para agregar nodos
  const agregarNodos = (nodos: Nodo[], nivel: number = 0, valoresAnteriores: string[] = []) => {
    nodos.forEach(nodo => {
      const nuevosValores = [...valoresAnteriores];
      if (nodo.tipo === 'cuenta') {
        nuevosValores[nivel] = nodo.nombre;
        if (nivel < profundidadMaxima - 1) {
          for (let i = nivel + 1; i < profundidadMaxima; i++) {
            nuevosValores[i] = nodo.nombre;
          }
        }
      } else {
        nuevosValores[nivel] = nodo.nombre;
      }

      // Crear objeto de fila dinámicamente
      const rowData: { [key: string]: string | number | boolean } = {
        nombreInforme: formato.nombre
      };
      for (let i = 0; i < profundidadMaxima; i++) {
        rowData[`nivel${i + 1}`] = nuevosValores[i] || '';
      }

      // Centros de costo seleccionados (ID Netsuite y nombres)
      if (nodo.centrosCosto && nodo.centrosCosto.length > 0 && centrosCostoList.length > 0) {
        rowData['centrosCostoIds'] = nodo.centrosCosto.map(id => {
          const centro = centrosCostoList.find(c => c.id === id);
          return centro ? centro.idNetsuite : '';
        }).filter(Boolean).join(', ');
        rowData['centrosCostoNombres'] = nodo.centrosCosto.map(id => {
          const centro = centrosCostoList.find(c => c.id === id);
          return centro ? centro.nombre : '';
        }).filter(Boolean).join(', ');
      } else {
        rowData['centrosCostoIds'] = '';
        rowData['centrosCostoNombres'] = '';
      }

      // Invertir valor (solo para cuentas contables)
      rowData['invertirValor'] = nodo.tipo === 'cuenta' && nodo.invertirValor === true ? true : false;

      // Orden global de línea en informe (solo para cuentas)
      if (nodo.tipo === 'cuenta') {
        rowData['ordenGlobal'] = ordenGlobal++;
      } else {
        rowData['ordenGlobal'] = '';
      }

      // Es línea de informe
      rowData['esLineaInforme'] = nodo.tipo === 'cuenta';

      // Si es cuenta, llenar las columnas extra
      if (nodo.tipo === 'cuenta' && nodo.cuenta) {
        rowData['numeroCuenta'] = nodo.cuenta.codigo || '';
        rowData['nombreCuenta'] = nodo.cuenta.nombre || '';
        rowData['tipoCuenta'] = nodo.cuenta.naturaleza || '';
        rowData['descripcionCompleta'] = `${nodo.cuenta.codigo || ''} ${nodo.cuenta.nombre || ''}`.trim();
      } else {
        rowData['numeroCuenta'] = '';
        rowData['nombreCuenta'] = '';
        rowData['tipoCuenta'] = '';
        rowData['descripcionCompleta'] = '';
      }

      worksheet.addRow(rowData);

      // Si tiene hijos, continuar recursivamente
      if (nodo.hijos.length > 0) {
        agregarNodos(nodo.hijos, nivel + 1, nuevosValores);
      }
    });
  };

  // Agregar datos
  agregarNodos(formato.estructura);

  // Agregar bordes y estilo a todas las celdas con datos
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      // Si la celda contiene un número, aplicar formato numérico
      if (!isNaN(Number(cell.value))) {
        cell.numFmt = '#,##0.00';
      }
      // Estilo para datos (fondo blanco, letra negra)
      if (rowNumber > 1) {
        cell.font = { color: { argb: 'FF000000' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFFF' }
        };
      }
    });
  });

  return workbook.xlsx.writeBuffer() as Promise<Buffer>;
}