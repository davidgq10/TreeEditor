/**
 * Componente: DepartamentoManager
 * 
 * Descripción:
 * Este componente es el gestor principal de departamentos. Proporciona una interfaz completa
 * para visualizar, agregar, editar, eliminar e importar departamentos desde archivos Excel.
 * 
 * Ubicación de renderizado:
 * - Es el componente principal de la sección de gestión de departamentos
 * - Se renderiza en la ruta principal de la aplicación
 * 
 * Funcionalidad:
 * 1. Muestra una lista de departamentos con opciones de ordenamiento
 * 2. Permite agregar nuevos departamentos
 * 3. Permite editar departamentos existentes
 * 4. Permite eliminar departamentos con confirmación
 * 5. Permite importar departamentos desde archivos Excel
 * 6. Implementa ordenamiento por nombre y nombre_completo
 * 7. Maneja la validación de datos importados
 * 
 * Dependencias:
 * - Utiliza el store global (useAppStore) para gestionar el estado
 * - Integra varios componentes de diálogo para operaciones específicas
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger } from './ui/select';
import { Trash2, Upload, Download, Plus, ChevronUp, ChevronDown, Search, Filter, Pencil } from 'lucide-react';
import { useAppStore } from '../store';
import { Departamento, Nodo } from '../types';
import { AddDepartamentoDialog } from './AddDepartamentoDialog';
import UsageDetailsModal from './UsageDetailsModal';
import * as XLSX from 'xlsx';

type SortField = 'id' | 'nombre' | 'nombre_completo' | 'tipo';
type SortDirection = 'asc' | 'desc';

export const DepartamentoManager: React.FC = () => {
  // Estado global del store
  const { departamentos, agregarDepartamento, actualizarDepartamento, eliminarDepartamento, eliminarTodosDepartamentos, formatos} = useAppStore();
  
  // Estados para controlar los diálogos
  const [editingDepto, setEditingDepto] = useState<Departamento | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deptoToDelete, setDeptoToDelete] = useState<Departamento | null>(null);
  const [usageDetailsModalOpen, setUsageDetailsModalOpen] = useState(false);
  const [usageDetails, setUsageDetails] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDeptoDialogOpen, setIsAddDeptoDialogOpen] = useState(false);
  
  // Estados para la importación de datos
  const [previewData, setPreviewData] = useState<Departamento[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para el ordenamiento
  const [sortField, setSortField] = useState<SortField>('nombre');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [tiposDepto, setTiposDepto] = useState<Set<string>>(new Set());
  
  // Estado para el diálogo de confirmación de eliminación
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    showConfirmButton: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    showConfirmButton: true
  });

  // Función para manejar el ordenamiento de la tabla
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Función para obtener tipos únicos de departamentos existentes
  const actualizarTiposDepto = () => {
    const tipos = new Set<string>();
    departamentos.forEach(depto => {
      if (depto.tipo) {
        tipos.add(depto.tipo);
      }
    });
    setTiposDepto(tipos);
  };

  // Actualizar tipos cuando cambian los departamentos
  React.useEffect(() => {
    actualizarTiposDepto();
  }, [departamentos]);

  const sortedDepartamentos = React.useMemo(() => {
    let filtered = departamentos;
    
    if (filterTipo !== 'todos') {
      filtered = filtered.filter(depto => depto.tipo === filterTipo);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(depto => 
        String(depto.id).toLowerCase().includes(term) ||
        (depto.nombre && depto.nombre.toLowerCase().includes(term)) ||
        (depto.nombre_completo && depto.nombre_completo.toLowerCase().includes(term)) ||
        (depto.tipo && depto.tipo.toLowerCase().includes(term))
      );
    }

    return filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      const direction = sortDirection === 'asc' ? 1 : -1;

      if (aValue < bValue) return -1 * direction;
      if (aValue > bValue) return 1 * direction;
      return 0;
    });
  }, [departamentos, searchTerm, sortField, sortDirection, filterTipo]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension !== 'xlsx' && extension !== 'xls') {
        setImportError('Solo se aceptan archivos Excel (.xlsx, .xls)');
        return;
      }

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 });

      if (data.length < 2) {
        setImportError('El archivo debe contener al menos una fila de encabezados y una fila de datos');
        return;
      }

      const headers = data[0].map(h => h?.toString().toLowerCase().trim() || '');
      const idIndex = headers.findIndex(h => h === 'id');
      const nombreIndex = headers.findIndex(h => h === 'nombre');
      const nombreCompletoIndex = headers.findIndex(h => h === 'nombre_completo');
      const tipoIndex = headers.findIndex(h => h === 'tipo');

      if (nombreIndex === -1 || nombreCompletoIndex === -1 || tipoIndex === -1) {
        setImportError('El archivo debe contener las columnas: nombre, nombre_completo y tipo');
        return;
      }

      const preview: Departamento[] = [];
      const nombresExistentes = new Set(departamentos.map(d => d.nombre));
      const idsExistentes = new Set(departamentos.map(d => d.id));
      const nombresNuevos = new Set<string>();
      const idsNuevos = new Set<number>();
      let maxId = departamentos.reduce((max, d) => d.id > max ? d.id : max, 0);

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const idStr = idIndex > -1 ? row[idIndex]?.toString().trim() : undefined;
        const nombre = row[nombreIndex]?.toString().trim();
        const nombre_completo = row[nombreCompletoIndex]?.toString().trim();
        const tipo = row[tipoIndex]?.toString().trim();
        let idNum: number | undefined;

        if (!nombre || !nombre_completo || !tipo) {
          setImportError(`Error en la fila ${i + 1}: Faltan datos requeridos (nombre, nombre_completo, tipo).`);
          return;
        }

        if (idStr) {
          if (!/^\d+$/.test(idStr)) {
            setImportError(`Error en la fila ${i + 1}: El ID '${idStr}' no es un número entero válido.`);
            return;
          }
          idNum = parseInt(idStr, 10);
          if (idsNuevos.has(idNum)) {
            setImportError(`Error en la fila ${i + 1}: El ID '${idNum}' está duplicado en el archivo.`);
            return;
          }
        } else {
          maxId++;
          idNum = maxId;
        }

        if (nombresNuevos.has(nombre)) {
          setImportError(`Error en la fila ${i + 1}: El nombre de departamento '${nombre}' está duplicado en el archivo.`);
          return;
        }
        if (nombresExistentes.has(nombre) && !departamentos.some(d => d.nombre === nombre && d.id === idNum)) {
          setImportError(`Error en la fila ${i + 1}: El departamento con nombre '${nombre}' ya existe con un ID diferente.`);
          return;
        }

        preview.push({
          id: idNum,
          nombre,
          nombre_completo,
          tipo
        });

        nombresNuevos.add(nombre);
        idsNuevos.add(idNum);
      }

      if (preview.length === 0) {
        setImportError('No se encontraron datos válidos para importar');
        return;
      }

      setPreviewData(preview);
      setImportError(null);
    } catch (error) {
      console.error('Error al procesar el archivo:', error);
      setImportError('Error al procesar el archivo Excel. Asegúrese de que el formato sea correcto y no esté dañado.');
    }
  };

  const handleImportConfirm = () => {
    previewData.forEach(depto => {
      const existing = departamentos.find(d => d.id === depto.id);
      if (existing) {
        actualizarDepartamento(depto.id, depto);
      } else {
        // The ID was already generated and validated in processFile
        agregarDepartamento(depto);
      }
    });
    setPreviewData([]);
    setIsImportDialogOpen(false);
  };

  const handleDeleteDepto = (depto: Departamento) => {
    setDeleteConfirmation({
      isOpen: true,
      title: 'Eliminar Departamento',
      message: `¿Estás seguro de eliminar el departamento "${depto.nombre}"? Esta acción no se puede deshacer.`,
      onConfirm: () => {
        try {
          eliminarDepartamento(depto.id);
          setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          const err = error as any;
          if (err.usageDetails) {
            setUsageDetails(err.usageDetails);
            setUsageDetailsModalOpen(true);
            setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
          } else {
            setDeleteConfirmation({
              isOpen: true,
              title: 'Error al eliminar departamento',
              message: err.message,
              onConfirm: () => setDeleteConfirmation(prev => ({ ...prev, isOpen: false })),
              showConfirmButton: false
            });
          }
        }
      },
      showConfirmButton: true
    });
  };

  const handleDeleteAll = () => {
    // Verificar si algún departamento está siendo utilizado en algún informe
    const deptosEnUso = departamentos.filter(depto => {
      return formatos.some(formato => {
        const buscarDeptoEnNodos = (nodos: Nodo[]): boolean => {
          return nodos.some(nodo => {
            if (nodo.departamentos && (nodo.departamentos.includes(String(depto.id)) || (depto.idNetsuite && nodo.departamentos.includes(depto.idNetsuite)))) {
              return true;
            }
            if (nodo.hijos.length > 0) {
              return buscarDeptoEnNodos(nodo.hijos);
            }
            return false;
          });
        };
        return buscarDeptoEnNodos(formato.estructura);
      });
    });

    if (deptosEnUso.length > 0) {
      setDeleteConfirmation({
        isOpen: true,
        title: 'No se pueden eliminar todos los departamentos',
        message: (
          <div className="space-y-4">
            <div className="text-red-600 font-medium">
              No se pueden eliminar todos los departamentos porque los siguientes están siendo utilizados en informes:
            </div>
            <div className="bg-red-50 p-4 rounded-md">
              <ul className="list-disc pl-5 space-y-1">
                {deptosEnUso.map(depto => (
                  <li key={depto.id} className="text-gray-700">{depto.nombre}</li>
                ))}
              </ul>
            </div>
            <div className="text-sm text-gray-600">
              Por favor, elimine estos departamentos de los informes antes de intentar eliminarlos del catálogo.
            </div>
          </div>
        ),
        onConfirm: () => {
          setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
        },
        showConfirmButton: false
      });
      return;
    }

    setDeleteConfirmation({
      isOpen: true,
      title: 'Eliminar Todos los Departamentos',
      message: '¿Estás seguro de que deseas eliminar TODOS los departamentos? Esta acción es irreversible.',
      onConfirm: () => {
        eliminarTodosDepartamentos();
        setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
      },
      showConfirmButton: true
    });
  };

  const handleSaveDepto = (depto: Departamento) => {
    if (editingDepto) {
      actualizarDepartamento(editingDepto.id, depto);
    } else {
      agregarDepartamento(depto);
    }
    setEditingDepto(null);
    setIsAddDeptoDialogOpen(false);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-none px-6 pt-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Departamentos</h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsAddDeptoDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Agregar Departamento
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Importar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar Todo
            </Button>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filtrar por tipo:</span>
            <Select value={filterTipo} onValueChange={(value: string) => setFilterTipo(value)}>
              <SelectTrigger className="w-[200px]">
                {filterTipo === 'todos' 
                  ? 'Todos los tipos' 
                  : filterTipo}
              </SelectTrigger>
              <SelectContent className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <SelectItem value="todos">Todos los tipos</SelectItem>
                {Array.from(tiposDepto).sort().map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Buscar por nombre, nombre completo o tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

      </div>

      <div className="flex-1 px-6 pb-6 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left cursor-pointer w-24" onClick={() => handleSort('id')}>
                <div className="flex items-center gap-1">
                  ID
                  {getSortIcon('id')}
                </div>
              </th>
              <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleSort('nombre')}>
                <div className="flex items-center gap-1">
                  Nombre
                  {getSortIcon('nombre')}
                </div>
              </th>
              <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleSort('nombre_completo')}>
                <div className="flex items-center gap-1">
                  Nombre Completo
                  {getSortIcon('nombre_completo')}
                </div>
              </th>
              <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleSort('tipo')}>
                <div className="flex items-center gap-1">
                  Tipo
                  {getSortIcon('tipo')}
                </div>
              </th>
              <th className="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedDepartamentos.map((depto) => (
              <tr key={depto.id} className="border-t border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                <td className="px-4 py-2">{depto.id}</td>
                <td className="px-4 py-2">{depto.nombre}</td>
                <td className="px-4 py-2">{depto.nombre_completo}</td>
                <td className="px-4 py-2">{depto.tipo}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingDepto(depto);
                        setIsAddDeptoDialogOpen(true);
                      }}
                      className="hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
                    >
                      <Pencil className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDepto(depto)}
                      className="hover:bg-red-50 hover:text-red-600 transition-colors duration-150"
                    >
                      <Trash2 className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddDepartamentoDialog
        isOpen={isAddDeptoDialogOpen || !!editingDepto}
        onClose={() => {
          setIsAddDeptoDialogOpen(false);
          setEditingDepto(null);
        }}
        deptoToEdit={editingDepto}
        onSave={handleSaveDepto}
      />

      <Dialog 
        open={isImportDialogOpen} 
        onOpenChange={(open) => {
          setIsImportDialogOpen(open);
          if (!open) {
            setImportError(null);
            setPreviewData([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Departamentos</DialogTitle>
            <DialogDescription>
              <div className="space-y-4">
                <p>Para importar departamentos desde un archivo Excel, siga estas indicaciones:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>El archivo debe estar en formato Excel (<b>.xlsx</b> o <b>.xls</b>).</li>
                  <li>La primera fila debe contener los encabezados de las columnas.</li>
                  <li>Las columnas requeridas son <b>nombre</b>, <b>nombre_completo</b> y <b>tipo</b>.</li>
                  <li>La columna <b>id</b> es opcional. Si se incluye, se usará para actualizar departamentos existentes. Si se omite, se crearán nuevos departamentos.</li>
                  <li>Los nombres de departamento deben ser únicos.</li>
                  <li>No se permiten filas vacías entre los datos.</li>
                </ul>
                <div className="bg-gray-100 p-4 rounded text-sm">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="border p-2">id</th>
                        <th className="border p-2">nombre</th>
                        <th className="border p-2">nombre_completo</th>
                        <th className="border p-2">tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border p-2">1</td>
                        <td className="border p-2">Ventas</td>
                        <td className="border p-2">Departamento de Ventas</td>
                        <td className="border p-2">Comercial</td>
                      </tr>
                      <tr>
                        <td className="border p-2">2</td>
                        <td className="border p-2">TI</td>
                        <td className="border p-2">Tecnologías de la Información</td>
                        <td className="border p-2">Administrativo</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
              isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                Arrastre y suelte el archivo Excel aquí, o haga clic para seleccionar un archivo
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Solo se aceptan archivos .xlsx y .xls
              </p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  processFile(file);
                }
              }}
            />
          </div>

          {importError && (
            <Alert variant="destructive">
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          )}

          {previewData.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Vista previa de importación:</h3>
              <div className="max-h-60 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">Nombre</th>
                      <th className="text-left p-2">Nombre Completo</th>
                      <th className="text-left p-2">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((depto, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{depto.id}</td>
                        <td className="p-2">{depto.nombre}</td>
                        <td className="p-2">{depto.nombre_completo}</td>
                        <td className="p-2">{depto.tipo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => {
              setIsImportDialogOpen(false);
              setImportError(null);
              setPreviewData([]);
            }}>
              Cancelar
            </Button>
            <Button
              onClick={handleImportConfirm}
              disabled={previewData.length === 0 || !!importError}
            >
              Importar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmation.isOpen} onOpenChange={(open) => !open && setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deleteConfirmation.title}</DialogTitle>
            <DialogDescription>
              {typeof deleteConfirmation.message === 'string' ? deleteConfirmation.message : deleteConfirmation.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}>
              Cancelar
            </Button>
            {deleteConfirmation.showConfirmButton && (
              <Button variant="destructive" onClick={deleteConfirmation.onConfirm}>
                Confirmar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UsageDetailsModal
        isOpen={usageDetailsModalOpen}
        onClose={() => setUsageDetailsModalOpen(false)}
        usageDetails={usageDetails}
      />
    </div>
  );
};
