import ExcelJS from 'exceljs';
import { Formato, Nodo, CuentaContable, CentroCosto, Departamento, GrupoCuentas } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface ExportOptions {
  formato: Formato;
  datos: { [cuentaId: string]: number };
  centrosCostoList?: CentroCosto[]; // Opcional, para mostrar nombres
  departamentosList?: Departamento[]; // Opcional, para mostrar nombres
  onProgress?: (current: number, total: number, phase: string) => void;
}

export async function exportarAExcel({ formato, datos, centrosCostoList = [], departamentosList = [] }: ExportOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('FormatoInforme');

  // FunciÃ³n para obtener la profundidad mÃ¡xima del Ã¡rbol
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

  const profundidadMaxima = obtenerProfundidadMaxima(formato.estructura) + 1;

  // --- INICIO: LÃ³gica para generar columnas de orden ---
  const nivelesUnicos: { [key: string]: string[] } = {}; // Usar array para mantener el orden de apariciÃ³n

  // FunciÃ³n para recolectar valores Ãºnicos de cada nivel en orden de apariciÃ³n
  const recolectarValoresNiveles = (nodos: Nodo[], nivel = 0, valoresAnteriores: string[] = []) => {
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

      for (let i = 0; i < profundidadMaxima; i++) {
        const valorNivel = nuevosValores[i];
        if (valorNivel) {
          const keyNivel = `nivel${i + 1}`;
          if (!nivelesUnicos[keyNivel]) {
            nivelesUnicos[keyNivel] = [];
          }
          if (!nivelesUnicos[keyNivel].includes(valorNivel)) {
            nivelesUnicos[keyNivel].push(valorNivel);
          }
        }
      }

      if (nodo.hijos.length > 0) {
        recolectarValoresNiveles(nodo.hijos, nivel + 1, nuevosValores);
      }
    });
  };

  recolectarValoresNiveles(formato.estructura);

  // Crear mapas de ordenamiento para cada nivel basados en el orden de apariciÃ³n
  const mapasDeOrden: { [key: string]: Map<string, number> } = {};
  for (let i = 0; i < profundidadMaxima; i++) {
    const keyNivel = `nivel${i + 1}`;
    if (nivelesUnicos[keyNivel]) {
      const valoresEnOrdenDeAparicion = nivelesUnicos[keyNivel];
      mapasDeOrden[keyNivel] = new Map(valoresEnOrdenDeAparicion.map((valor, index) => [valor, index + 1]));
    }
  }
  // --- FIN: LÃ³gica para generar columnas de orden ---

  // Configurar columnas dinÃ¡micamente con columnas de orden
  const columns = [
    { header: 'Nombre del informe', key: 'nombreInforme', width: 30 },
  ];

  for (let i = 0; i < profundidadMaxima; i++) {
    columns.push({ header: `Nivel ${i + 1}`, key: `nivel${i + 1}`, width: 30 });
    columns.push({ header: `Orden N${i + 1}`, key: `ordenN${i + 1}`, width: 15 });
  }

  columns.push(
    { header: 'Centro de costo seleccionados', key: 'centrosCostoIds', width: 30 },
    { header: 'Nombres de centro de costo seleccionados', key: 'centrosCostoNombres', width: 40 },
    { header: 'Departamento seleccionados', key: 'departamentosIds', width: 30 },
    { header: 'Nombres de departamento seleccionados', key: 'departamentosNombres', width: 40 },
    { header: 'Invertir valor', key: 'invertirValor', width: 15 },
    { header: 'Orden global de linea en informe', key: 'ordenGlobal', width: 15 },
    { header: 'ID Cuenta Contable', key: 'idCuentaContable', width: 40 },
    { header: 'Numero de Cuenta', key: 'numeroCuenta', width: 20 },
    { header: 'Nombre de Cuenta', key: 'nombreCuenta', width: 30 },
    { header: 'Tipo de Cuenta', key: 'tipoCuenta', width: 20 },
    { header: 'DescripciÃ³n completa', key: 'descripcionCompleta', width: 40 },
    { header: 'Tipo de Nodo', key: 'tipoNodo', width: 15 },
    { header: 'Es Linea de Informe', key: 'esLineaInforme', width: 15 }
  );

  worksheet.columns = columns;

  // Estilo para encabezados
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF000000' }
  };

  let ordenGlobal = 1;
  // FunciÃ³n recursiva para agregar nodos
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

      const rowData: { [key: string]: string | number | boolean } = {
        nombreInforme: formato.nombre
      };
      
      for (let i = 0; i < profundidadMaxima; i++) {
        const valorNivel = nuevosValores[i] || '';
        rowData[`nivel${i + 1}`] = valorNivel;
        if (valorNivel && mapasDeOrden[`nivel${i + 1}`]) {
          rowData[`ordenN${i + 1}`] = mapasDeOrden[`nivel${i + 1}`].get(valorNivel) || '';
        } else {
          rowData[`ordenN${i + 1}`] = '';
        }
      }

      if (nodo.centrosCosto && nodo.centrosCosto.length > 0 && centrosCostoList.length > 0) {
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

      if (nodo.departamentos && nodo.departamentos.length > 0 && departamentosList.length > 0) {
        const departamentosEncontrados = nodo.departamentos
          .map(deptoId => {
            const depto = departamentosList.find(d => 
              String(d.id) === String(deptoId) || d.idNetsuite === deptoId
            );
            return depto ? { id: depto.id, nombre: depto.nombre } : null;
          })
          .filter(Boolean);
        
        rowData['departamentosIds'] = departamentosEncontrados.map(d => d?.id).join(', ');
        rowData['departamentosNombres'] = departamentosEncontrados.map(d => d?.nombre).join(', ');
      } else {
        rowData['departamentosIds'] = '';
        rowData['departamentosNombres'] = '';
      }

      rowData['invertirValor'] = nodo.tipo === 'cuenta' && nodo.invertirValor === true ? true : false;

      if (nodo.tipo === 'cuenta' || nodo.tipo === 'medida') {
        rowData['ordenGlobal'] = ordenGlobal++;
      } else {
        rowData['ordenGlobal'] = '';
      }

      rowData['tipoNodo'] = nodo.tipo;
      rowData['esLineaInforme'] = nodo.tipo === 'cuenta' || nodo.tipo === 'medida';

      if (nodo.tipo === 'cuenta' && nodo.cuenta) {
        rowData['idCuentaContable'] = nodo.cuenta.id || '';
        rowData['numeroCuenta'] = nodo.cuenta.codigo || '';
        rowData['nombreCuenta'] = nodo.cuenta.nombre || '';
        rowData['tipoCuenta'] = nodo.cuenta.naturaleza || '';
        rowData['descripcionCompleta'] = `${nodo.cuenta.codigo || ''} ${nodo.cuenta.nombre || ''}`.trim();
      }
      else if (nodo.tipo === 'medida') {
        rowData['idCuentaContable'] = '';
        rowData['numeroCuenta'] = nodo.nombre;
        rowData['nombreCuenta'] = nodo.nombre;
        rowData['tipoCuenta'] = nodo.nombre;
        rowData['descripcionCompleta'] = nodo.nombre;
      }
      else {
        rowData['idCuentaContable'] = '';
        rowData['numeroCuenta'] = '';
        rowData['nombreCuenta'] = '';
        rowData['tipoCuenta'] = '';
        rowData['descripcionCompleta'] = '';
      }

      worksheet.addRow(rowData);

      if (nodo.hijos.length > 0) {
        agregarNodos(nodo.hijos, nivel + 1, nuevosValores);
      }
    });
  };

  agregarNodos(formato.estructura);

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
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

  return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

export interface ImportOptions {
  file: File;
  centrosCostoList: CentroCosto[];
  departamentosList: Departamento[];
}

export async function importFromExcel({ file, centrosCostoList, departamentosList }: ImportOptions): Promise<{ formato: Formato }> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('El archivo Excel no contiene hojas de cÃ¡lculo');
  }

  // Obtener Ã­ndices de columnas
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
    'Departamento seleccionados',
    'Nombres de departamento seleccionados',
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
    centrosCostoDefault: [],
    departamentosDefault: []
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
    const nivel6 = columnIndices['Nivel 6'] ? row.getCell(columnIndices['Nivel 6']).value?.toString()?.trim() : null;
    const nivel7 = columnIndices['Nivel 7'] ? row.getCell(columnIndices['Nivel 7']).value?.toString()?.trim() : null;
    const nivel8 = columnIndices['Nivel 8'] ? row.getCell(columnIndices['Nivel 8']).value?.toString()?.trim() : null;
    const nivel9 = columnIndices['Nivel 9'] ? row.getCell(columnIndices['Nivel 9']).value?.toString()?.trim() : null;
    const nivel10 = columnIndices['Nivel 10'] ? row.getCell(columnIndices['Nivel 10']).value?.toString()?.trim() : null;

    const idCuentaContable = columnIndices['ID Cuenta Contable'] ? row.getCell(columnIndices['ID Cuenta Contable']).value?.toString()?.trim() : null;
    const numeroCuenta = row.getCell(columnIndices['Numero de Cuenta']).value?.toString()?.trim();
    const nombreCuenta = row.getCell(columnIndices['Nombre de Cuenta']).value?.toString()?.trim();
    const tipoCuenta = row.getCell(columnIndices['Tipo de Cuenta']).value?.toString()?.trim();
    const invertirValor = row.getCell(columnIndices['Invertir valor']).value === true;
    
    // Obtener los IDs de NetSuite de los centros de costo
    const centrosCostoCell = row.getCell(columnIndices['Centro de costo seleccionados']).value;
    const departamentosCell = row.getCell(columnIndices['Departamento seleccionados']).value;
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
      
    console.log('IDs de NetSuite extraÃ­dos:', centrosCostoIds);
    
    // Verificar que todos los IDs existan en centrosCostoList
    const centrosNoEncontrados = centrosCostoIds.filter(netSuiteId => 
      !centrosCostoList.some(c => c.idNetsuite === netSuiteId)
    );
    
    if (centrosNoEncontrados.length > 0) {
      console.warn('Los siguientes IDs de NetSuite no se encontraron en la lista de centros de costo:', centrosNoEncontrados);
    }

    // Procesar departamentos
    const departamentosStr = Array.isArray(departamentosCell)
      ? departamentosCell.join(',')
      : departamentosCell?.toString() || '';
    
    const departamentosIds = departamentosStr
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);

    const departamentosNoEncontrados = departamentosIds.filter(netSuiteId =>
      !departamentosList.some(d => d.idNetsuite === netSuiteId)
    );

    if (departamentosNoEncontrados.length > 0) {
      console.warn('Los siguientes IDs de NetSuite de departamentos no se encontraron:', departamentosNoEncontrados);
    }
    
    // Determinar el nivel actual basado en las columnas con valores (hasta 30 niveles)
    let currentLevel = 0;
    const niveles = [nivel1, nivel2, nivel3, nivel4, nivel5, nivel6, nivel7, nivel8, nivel9, nivel10];
    
    // Extender para soportar hasta 30 niveles
    for (let level = 11; level <= 30; level++) {
      const nivelCol = columnIndices[`Nivel ${level}`];
      if (nivelCol) {
        const nivelValue = row.getCell(nivelCol).value?.toString()?.trim();
        niveles.push(nivelValue);
      } else {
        niveles.push(null);
      }
    }
    
    // Encontrar el nivel mÃ¡s profundo con contenido
    for (let i = niveles.length - 1; i >= 0; i--) {
      if (niveles[i]) {
        currentLevel = i;
        break;
      }
    }
    
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
        // Si es lÃ­nea de informe pero no tiene nÃºmero de cuenta, es una medida
        tipoNodo = 'medida';
      }
    }
    
    // Si es una cuenta (tiene nÃºmero de cuenta) o una medida
    if ((tipoNodo === 'cuenta' && numeroCuenta && nombreCuenta) || tipoNodo === 'medida') {
      // Solo crear objeto CuentaContable para nodos tipo cuenta
      const cuenta = tipoNodo === 'cuenta' ? {
        id: idCuentaContable || uuidv4(),
        codigo: numeroCuenta || '',
        nombre: nombreCuenta || '',
        naturaleza: tipoCuenta || 'gasto'
      } : undefined;
      
      const node: Nodo = {
        id: uuidv4(),
        tipo: tipoNodo,
        nombre: tipoNodo === 'cuenta' ? (nombreCuenta || '') : (niveles[currentLevel] || 'Nueva Medida'),
        cuenta: tipoNodo === 'cuenta' ? cuenta : undefined,
        cuentaId: tipoNodo === 'cuenta' ? cuenta?.id : undefined,
        hijos: [],
        centrosCosto: centrosCostoIds,
        departamentos: departamentosIds,
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
      const nombreGrupo = niveles[currentLevel] || nivel1;
      const node: Nodo = {
        id: uuidv4(),
        tipo: 'grupo',
        nombre: nombreGrupo,
        hijos: [],
        centrosCosto: [],
        departamentos: [],
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

  const departamentosDefault = new Set<string>();
  const processNodeDepto = (node: Nodo) => {
    if (node.departamentos && node.departamentos.length > 0) {
      node.departamentos.forEach(deptoId => departamentosDefault.add(deptoId));
    }
    node.hijos.forEach(processNodeDepto);
  };

  formato.estructura.forEach(processNodeDepto);
  formato.departamentosDefault = Array.from(departamentosDefault);
  
  return { formato };
}

// Interfaces para exportar/importar grupos de cuentas
interface ExportGruposOptions {
  gruposCuentas: GrupoCuentas[];
  cuentasList: CuentaContable[];
}

interface ImportGruposOptions {
  file: File;
  cuentasList: CuentaContable[];
}

export async function exportarGruposCuentasAExcel({ gruposCuentas, cuentasList }: ExportGruposOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('GruposCuentas');

  // Configurar columnas
  worksheet.columns = [
    { header: 'ID Grupo', key: 'idGrupo', width: 40 },
    { header: 'Nombre Grupo', key: 'nombreGrupo', width: 30 },
    { header: 'DescripciÃ³n Grupo', key: 'descripcionGrupo', width: 50 },
    { header: 'Fecha CreaciÃ³n', key: 'fechaCreacion', width: 20 },
    { header: 'Fecha ModificaciÃ³n', key: 'fechaModificacion', width: 20 },
    { header: 'ID Cuenta', key: 'idCuenta', width: 40 },
    { header: 'CÃ³digo Cuenta', key: 'codigoCuenta', width: 20 },
    { header: 'Nombre Cuenta', key: 'nombreCuenta', width: 30 },
    { header: 'Naturaleza Cuenta', key: 'naturalezaCuenta', width: 20 }
  ];

  // Estilo para encabezados
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }
  };

  // FunciÃ³n auxiliar para formatear fechas de forma segura
  const formatearFecha = (fecha: Date | string | undefined): string => {
    if (!fecha) return new Date().toISOString().split('T')[0];
    
    try {
      const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
      if (isNaN(fechaObj.getTime())) {
        return new Date().toISOString().split('T')[0];
      }
      return fechaObj.toISOString().split('T')[0];
    } catch (error) {
      console.warn('Error al formatear fecha:', error);
      return new Date().toISOString().split('T')[0];
    }
  };

  // Agregar datos
  gruposCuentas.forEach(grupo => {
    const cuentasDelGrupo = grupo.cuentas
      .map(cuentaId => cuentasList.find(c => c.id === cuentaId))
      .filter((cuenta): cuenta is CuentaContable => cuenta !== undefined);

    const fechaCreacionFormatted = formatearFecha(grupo.fechaCreacion);
    const fechaModificacionFormatted = formatearFecha(grupo.fechaModificacion);

    if (cuentasDelGrupo.length === 0) {
      // Si el grupo no tiene cuentas vÃ¡lidas, agregar una fila solo con datos del grupo
      worksheet.addRow({
        idGrupo: grupo.id || '',
        nombreGrupo: grupo.nombre || '',
        descripcionGrupo: grupo.descripcion || '',
        fechaCreacion: fechaCreacionFormatted,
        fechaModificacion: fechaModificacionFormatted,
        idCuenta: '',
        codigoCuenta: '',
        nombreCuenta: '',
        naturalezaCuenta: ''
      });
    } else {
      // Agregar una fila por cada cuenta en el grupo
      cuentasDelGrupo.forEach(cuenta => {
        worksheet.addRow({
          idGrupo: grupo.id || '',
          nombreGrupo: grupo.nombre || '',
          descripcionGrupo: grupo.descripcion || '',
          fechaCreacion: fechaCreacionFormatted,
          fechaModificacion: fechaModificacionFormatted,
          idCuenta: cuenta.id || '',
          codigoCuenta: cuenta.codigo || '',
          nombreCuenta: cuenta.nombre || '',
          naturalezaCuenta: cuenta.naturaleza || ''
        });
      });
    }
  });

  // Agregar bordes y estilo a todas las celdas con datos
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
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

  return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

export async function importarGruposCuentasDesdeExcel({ file, cuentasList }: ImportGruposOptions): Promise<{ gruposCuentas: GrupoCuentas[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('El archivo Excel no contiene hojas de cÃ¡lculo');
  }

  // Obtener Ã­ndices de columnas
  const headerRow = worksheet.getRow(1);
  const columnIndices: { [key: string]: number } = {};
  
  headerRow.eachCell((cell, colNumber) => {
    columnIndices[String(cell.value).trim()] = colNumber;
  });

  // Validar columnas requeridas
  const requiredColumns = [
    'ID Grupo',
    'Nombre Grupo',
    'Fecha CreaciÃ³n',
    'Fecha ModificaciÃ³n'
  ];

  for (const col of requiredColumns) {
    if (!(col in columnIndices)) {
      throw new Error(`Columna requerida no encontrada: ${col}`);
    }
  }

  // Mapa para agrupar cuentas por grupo
  const gruposMap = new Map<string, {
    id: string;
    nombre: string;
    descripcion: string;
    fechaCreacion: Date;
    fechaModificacion: Date;
    cuentas: string[];
  }>();

  // Procesar filas (empezando desde la fila 2 que contiene datos)
  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    
    // Verificar si la fila estÃ¡ vacÃ­a
    const isEmptyRow = !row.hasValues;
    if (isEmptyRow) {
      continue;
    }
    
    // Obtener valores de las celdas
    const idGrupo = row.getCell(columnIndices['ID Grupo']).value?.toString()?.trim();
    const nombreGrupo = row.getCell(columnIndices['Nombre Grupo']).value?.toString()?.trim();
    const descripcionGrupo = columnIndices['DescripciÃ³n Grupo'] 
      ? row.getCell(columnIndices['DescripciÃ³n Grupo']).value?.toString()?.trim() || ''
      : '';
    const fechaCreacionStr = row.getCell(columnIndices['Fecha CreaciÃ³n']).value?.toString()?.trim();
    const fechaModificacionStr = row.getCell(columnIndices['Fecha ModificaciÃ³n']).value?.toString()?.trim();
    const idCuenta = columnIndices['ID Cuenta'] 
      ? row.getCell(columnIndices['ID Cuenta']).value?.toString()?.trim()
      : '';

    console.log(`Fila ${i}: idGrupo=${idGrupo}, nombreGrupo=${nombreGrupo}, idCuenta=${idCuenta}`);

    // Validar datos requeridos del grupo
    if (!idGrupo || !nombreGrupo) {
      console.warn(`Fila ${i}: Faltan datos requeridos del grupo (ID o nombre), saltando fila`);
      continue;
    }

    // Parsear fechas
    let fechaCreacion: Date;
    let fechaModificacion: Date;
    
    try {
      fechaCreacion = fechaCreacionStr ? new Date(fechaCreacionStr) : new Date();
      fechaModificacion = fechaModificacionStr ? new Date(fechaModificacionStr) : new Date();
      
      if (isNaN(fechaCreacion.getTime()) || isNaN(fechaModificacion.getTime())) {
        throw new Error('Fecha invÃ¡lida');
      }
    } catch (error) {
      console.warn(`Fila ${i}: Error al parsear fechas, usando fechas por defecto`);
      fechaCreacion = new Date();
      fechaModificacion = new Date();
    }

    // Verificar si el grupo ya existe en el mapa
    if (!gruposMap.has(idGrupo)) {
      gruposMap.set(idGrupo, {
        id: uuidv4(), // Generar nuevo ID Ãºnico para evitar conflictos
        nombre: nombreGrupo,
        descripcion: descripcionGrupo,
        fechaCreacion,
        fechaModificacion,
        cuentas: []
      });
    }

    // Agregar cuenta al grupo si existe y es vÃ¡lida
    if (idCuenta) {
      const cuentaExiste = cuentasList.some(c => c.id === idCuenta);
      if (cuentaExiste) {
        const grupo = gruposMap.get(idGrupo)!;
        if (!grupo.cuentas.includes(idCuenta)) {
          grupo.cuentas.push(idCuenta);
        }
      } else {
        console.warn(`Fila ${i}: Cuenta con ID ${idCuenta} no encontrada en el catÃ¡logo, saltando cuenta`);
      }
    }
  }

  // Convertir el mapa a array de grupos
  const gruposCuentas: GrupoCuentas[] = Array.from(gruposMap.values()).map(grupo => ({
    id: grupo.id,
    nombre: grupo.nombre,
    descripcion: grupo.descripcion,
    cuentas: grupo.cuentas,
    fechaCreacion: grupo.fechaCreacion,
    fechaModificacion: grupo.fechaModificacion
  }));

  console.log(`Grupos procesados: ${gruposCuentas.length}`);
  gruposCuentas.forEach(grupo => {
    console.log(`Grupo: ${grupo.nombre}, Cuentas: ${grupo.cuentas.length}`);
  });

  if (gruposCuentas.length === 0) {
    throw new Error('No se encontraron grupos vÃ¡lidos para importar');
  }

  return { gruposCuentas };
}
