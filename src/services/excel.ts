import ExcelJS from 'exceljs';
import { Formato, Nodo, CuentaContable, CentroCosto } from '../types';
import { v4 as uuidv4 } from 'uuid';

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
    { header: 'Tipo de Nodo', key: 'tipoNodo', width: 15 },
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
      if (nodo.tipo === 'cuenta' || nodo.tipo === 'medida') {
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
        // Los IDs ya son NetSuite IDs, solo necesitamos verificar que existan en la lista
        const centrosEncontrados = nodo.centrosCosto
          .map(netSuiteId => {
            const centro = centrosCostoList.find(c => c.idNetsuite === netSuiteId);
            return centro ? { id: netSuiteId, nombre: centro.nombre } : null;
          })
          .filter(Boolean);
        
        rowData['centrosCostoIds'] = centrosEncontrados.map(c => c?.id).join(', ');
        rowData['centrosCostoNombres'] = centrosEncontrados.map(c => c?.nombre).join(', ');
      } else {
        rowData['centrosCostoIds'] = '';
        rowData['centrosCostoNombres'] = '';
      }

      // Invertir valor (solo para cuentas contables)
      rowData['invertirValor'] = nodo.tipo === 'cuenta' && nodo.invertirValor === true ? true : false;

      // Orden global de línea en informe (solo para cuentas y medidas)
      if (nodo.tipo === 'cuenta' || nodo.tipo === 'medida') {
        rowData['ordenGlobal'] = ordenGlobal++;
      } else {
        rowData['ordenGlobal'] = '';
      }

      // Tipo de nodo (grupo, cuenta, medida)
      rowData['tipoNodo'] = nodo.tipo;

      // Es línea de informe (para cuentas y medidas)
      rowData['esLineaInforme'] = nodo.tipo === 'cuenta' || nodo.tipo === 'medida';

      // Si es cuenta, llenar las columnas extra con datos de cuenta
      if (nodo.tipo === 'cuenta' && nodo.cuenta) {
        rowData['numeroCuenta'] = nodo.cuenta.codigo || '';
        rowData['nombreCuenta'] = nodo.cuenta.nombre || '';
        rowData['tipoCuenta'] = nodo.cuenta.naturaleza || '';
        rowData['descripcionCompleta'] = `${nodo.cuenta.codigo || ''} ${nodo.cuenta.nombre || ''}`.trim();
      }
      // Si es medida, llenar las columnas extra con el nombre de la medida
      else if (nodo.tipo === 'medida') {
        rowData['numeroCuenta'] = nodo.nombre;
        rowData['nombreCuenta'] = nodo.nombre;
        rowData['tipoCuenta'] = nodo.nombre;
        rowData['descripcionCompleta'] = nodo.nombre;
      }
      // Otros casos
      else {
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

export interface ImportOptions {
  file: File;
  centrosCostoList: CentroCosto[];
}

export async function importFromExcel({ file, centrosCostoList }: ImportOptions): Promise<{ formato: Formato }> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('El archivo Excel no contiene hojas de cálculo');
  }

  // Obtener índices de columnas
  const headerRow = worksheet.getRow(1);
  const columnIndices: { [key: string]: number } = {};
  
  headerRow.eachCell((cell, colNumber) => {
    columnIndices[String(cell.value).trim()] = colNumber;
  });

  // Validar columnas requeridas
  const requiredColumns = [
    'Nivel 1', 
    'Numero de Cuenta',
    'Nombre de Cuenta',
    'Tipo de Cuenta',
    'Invertir valor',
    'Centro de costo seleccionados',
    'Nombres de centro de costo seleccionados',
    'Es Linea de Informe'
  ];
  
  // Columna opcional para compatibilidad con versiones anteriores
  const tipoNodoColumnExists = 'Tipo de Nodo' in columnIndices;

  for (const col of requiredColumns) {
    if (!(col in columnIndices)) {
      throw new Error(`Columna requerida no encontrada: ${col}`);
    }
  }

  const formato: Formato = {
    id: uuidv4(),
    nombre: `Importado_${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}`,
    estructura: [],
    centrosCostoDefault: []
  };

  // Mapa para mantener los nodos por nivel
  const nodesByLevel: { [level: number]: Nodo[] } = { 0: [] };
  const parentStack: { node: Nodo; level: number }[] = [];
  
  // Procesar filas (empezando desde la fila 2 que contiene datos)
  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    
    // Obtener valores de las celdas
    const nivel1 = row.getCell(columnIndices['Nivel 1']).value?.toString()?.trim();
    const nivel2 = columnIndices['Nivel 2'] ? row.getCell(columnIndices['Nivel 2']).value?.toString()?.trim() : null;
    const nivel3 = columnIndices['Nivel 3'] ? row.getCell(columnIndices['Nivel 3']).value?.toString()?.trim() : null;
    const nivel4 = columnIndices['Nivel 4'] ? row.getCell(columnIndices['Nivel 4']).value?.toString()?.trim() : null;
    const nivel5 = columnIndices['Nivel 5'] ? row.getCell(columnIndices['Nivel 5']).value?.toString()?.trim() : null;
    
    const numeroCuenta = row.getCell(columnIndices['Numero de Cuenta']).value?.toString()?.trim();
    const nombreCuenta = row.getCell(columnIndices['Nombre de Cuenta']).value?.toString()?.trim();
    const tipoCuenta = row.getCell(columnIndices['Tipo de Cuenta']).value?.toString()?.trim();
    const invertirValor = row.getCell(columnIndices['Invertir valor']).value === true;
    
    // Obtener los IDs de NetSuite de los centros de costo
    const centrosCostoCell = row.getCell(columnIndices['Centro de costo seleccionados']).value;
    console.log('Valor de la celda de centros de costo:', centrosCostoCell);
    
    // Si es un array, unirlo como string, si es string usarlo directamente
    const centrosCostoStr = Array.isArray(centrosCostoCell) 
      ? centrosCostoCell.join(',')
      : centrosCostoCell?.toString() || '';
      
    // Obtener los IDs de NetSuite de la celda
    const centrosCostoIds = centrosCostoStr
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
      
    console.log('IDs de NetSuite extraídos:', centrosCostoIds);
    
    // Verificar que todos los IDs existan en centrosCostoList
    const centrosNoEncontrados = centrosCostoIds.filter(netSuiteId => 
      !centrosCostoList.some(c => c.idNetsuite === netSuiteId)
    );
    
    if (centrosNoEncontrados.length > 0) {
      console.warn('Los siguientes IDs de NetSuite no se encontraron en la lista de centros de costo:', centrosNoEncontrados);
    }
    
    // Determinar el nivel actual basado en las columnas con valores
    let currentLevel = 0;
    if (nivel5) currentLevel = 4;
    else if (nivel4) currentLevel = 3;
    else if (nivel3) currentLevel = 2;
    else if (nivel2) currentLevel = 1;
    
    // Obtener el tipo de nodo
    const esLineaInforme = row.getCell(columnIndices['Es Linea de Informe']).value === true;
    let tipoNodo: 'grupo' | 'cuenta' | 'medida' = 'grupo';
    
    if (tipoNodoColumnExists) {
      const tipoNodoValue = row.getCell(columnIndices['Tipo de Nodo']).value?.toString()?.trim();
      if (tipoNodoValue === 'cuenta' || tipoNodoValue === 'medida' || tipoNodoValue === 'grupo') {
        tipoNodo = tipoNodoValue;
      }
    } else {
      // Para compatibilidad con versiones anteriores sin columna de tipo
      if (numeroCuenta && nombreCuenta && tipoCuenta) {
        tipoNodo = 'cuenta';
      } else if (esLineaInforme && !numeroCuenta) {
        // Si es línea de informe pero no tiene número de cuenta, es una medida
        tipoNodo = 'medida';
      }
    }
    
    // Si es una cuenta (tiene número de cuenta) o una medida
    if ((tipoNodo === 'cuenta' && numeroCuenta && nombreCuenta) || tipoNodo === 'medida') {
      // Solo crear objeto CuentaContable para nodos tipo cuenta
      const cuenta = tipoNodo === 'cuenta' ? {
        id: uuidv4(),
        codigo: numeroCuenta || '',
        nombre: nombreCuenta || '',
        naturaleza: (tipoCuenta || 'gasto').toLowerCase() as 'gasto' | 'ingreso'
      } : undefined;
      
      const node: Nodo = {
        id: uuidv4(),
        tipo: tipoNodo,
        nombre: tipoNodo === 'cuenta' ? (nombreCuenta || '') : (nivel5 || nivel4 || nivel3 || nivel2 || nivel1 || 'Nueva Medida'),
        cuenta: tipoNodo === 'cuenta' ? cuenta : undefined,
        cuentaId: tipoNodo === 'cuenta' ? cuenta?.id : undefined,
        hijos: [],
        centrosCosto: centrosCostoIds,
        invertirValor
      };
      
      // Agregar a los nodos del nivel actual
      if (!nodesByLevel[currentLevel]) {
        nodesByLevel[currentLevel] = [];
      }
      nodesByLevel[currentLevel].push(node);
      
      // Actualizar la pila de padres
      // Asegurar que solo se eliminen elementos si el nuevo nivel es menor
      if (currentLevel < parentStack.length) {
        parentStack.length = currentLevel;
      }
      
      // Verificar que exista un elemento antes de acceder a sus propiedades
      if (parentStack.length > 0 && parentStack[parentStack.length - 1] && parentStack[parentStack.length - 1].node) {
        parentStack[parentStack.length - 1].node.hijos.push(node);
      } else {
        formato.estructura.push(node);
      }
    } 
    // Si es un grupo
    else if (nivel1 && tipoNodo === 'grupo') {
      const nombreGrupo = nivel5 || nivel4 || nivel3 || nivel2 || nivel1;
      const node: Nodo = {
        id: uuidv4(),
        tipo: 'grupo',
        nombre: nombreGrupo,
        hijos: [],
        centrosCosto: [],
        invertirValor: false
      };
      
      // Agregar a los nodos del nivel actual
      if (!nodesByLevel[currentLevel]) {
        nodesByLevel[currentLevel] = [];
      }
      nodesByLevel[currentLevel].push(node);
      
      // Actualizar la pila de padres
      // Asegurar que solo se eliminen elementos si el nuevo nivel es menor
      if (currentLevel < parentStack.length) {
        parentStack.length = currentLevel;
      }
      
      // Verificar que exista un elemento antes de acceder a sus propiedades
      if (parentStack.length > 0 && parentStack[parentStack.length - 1] && parentStack[parentStack.length - 1].node) {
        parentStack[parentStack.length - 1].node.hijos.push(node);
      } else {
        formato.estructura.push(node);
      }
      
      // Agregar a la pila como padre potencial para los siguientes nodos
      parentStack.push({ node, level: currentLevel });
    }
  }
  
  // Obtener centros de costo por defecto de las cuentas
  const centrosCostoDefault = new Set<string>();
  const processNode = (node: Nodo) => {
    if (node.centrosCosto && node.centrosCosto.length > 0) {
      node.centrosCosto.forEach(centroId => centrosCostoDefault.add(centroId));
    }
    node.hijos.forEach(processNode);
  };
  
  formato.estructura.forEach(processNode);
  formato.centrosCostoDefault = Array.from(centrosCostoDefault);
  
  return { formato };
}