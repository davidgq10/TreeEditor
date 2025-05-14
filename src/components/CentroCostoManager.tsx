/**
 * Componente: CentroCostoManager
 * 
 * Descripción:
 * Este componente es el gestor principal de centros de costo. Proporciona una interfaz completa
 * para visualizar, agregar, editar, eliminar e importar centros de costo desde archivos Excel.
 * 
 * Ubicación de renderizado:
 * - Es el componente principal de la sección de gestión de centros de costo
 * - Se renderiza en la ruta principal de la aplicación
 * 
 * Funcionalidad:
 * 1. Muestra una lista de centros de costo con opciones de ordenamiento
 * 2. Permite agregar nuevos centros de costo
 * 3. Permite editar centros de costo existentes
 * 4. Permite eliminar centros de costo con confirmación
 * 5. Permite importar centros de costo desde archivos Excel
 * 6. Implementa ordenamiento por nombre y tipo
 * 7. Maneja la validación de datos importados
 * 
 * Dependencias:
 * - Utiliza el store global (useAppStore) para gestionar el estado
 * - Integra varios componentes de diálogo para operaciones específicas
 */

import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Pencil, Trash2, ChevronUp, ChevronDown, Plus, Upload } from 'lucide-react';
import { CentroCosto, Nodo } from '../types';
import { AddCentroCostoDialog } from './AddCentroCostoDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import * as XLSX from 'xlsx';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { useAppStore } from '../store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from './ui/select';
import { Input } from './ui/input';

type SortField = 'nombre' | 'tipo';
type SortDirection = 'asc' | 'desc';

export const CentroCostoManager: React.FC = () => {
  // Estado global del store
  const { centrosCosto, agregarCentroCosto, actualizarCentroCosto, eliminarCentroCosto, formatos } = useAppStore();
  
  // Estados para controlar los diálogos
  const [editingCentro, setEditingCentro] = useState<CentroCosto | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAddCentroDialogOpen, setIsAddCentroDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para la importación de datos
  const [previewData, setPreviewData] = useState<CentroCosto[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para el ordenamiento
  const [sortField, setSortField] = useState<SortField>('nombre');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [tiposCentro, setTiposCentro] = useState<Set<string>>(new Set());
  
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

  // Función para obtener tipos únicos de centros de costo existentes
  const actualizarTiposCentro = () => {
    const tipos = new Set<string>();
    centrosCosto.forEach(centro => {
      if (centro.tipo) {
        tipos.add(centro.tipo);
      }
    });
    setTiposCentro(tipos);
  };

  // Actualizar tipos cuando cambian los centros de costo
  React.useEffect(() => {
    actualizarTiposCentro();
  }, [centrosCosto]);

  // Función para manejar el ordenamiento de la tabla
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedCentrosCosto = () => {
    return [...centrosCosto]
      .filter(centro => filterTipo === 'todos' || centro.tipo === filterTipo)
      .filter(centro => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return centro.nombre.toLowerCase().includes(term) ||
               centro.tipo.toLowerCase().includes(term) ||
               (centro.idNetsuite?.toLowerCase() || '').includes(term);
      })
      .sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        const direction = sortDirection === 'asc' ? 1 : -1;

        if (aValue < bValue) return -1 * direction;
        if (aValue > bValue) return 1 * direction;
        return 0;
      });
  };

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
      if (extension !== 'xlsx') {
        setImportError('Solo se aceptan archivos Excel (.xlsx)');
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
      const idNetsuiteIndex = headers.findIndex(h => h === 'id netsuite' || h === 'idnetsuite');
      const nombreIndex = headers.findIndex(h => h === 'nombre');
      const tipoIndex = headers.findIndex(h => h === 'tipo');

      if (idNetsuiteIndex === -1 || nombreIndex === -1 || tipoIndex === -1) {
        setImportError('El archivo debe contener las columnas: ID Netsuite, Nombre y Tipo');
        return;
      }

      const preview: CentroCosto[] = [];
      const idNetsuiteExistentes = new Set(centrosCosto.map(c => c.idNetsuite));
      const idNetsuiteNuevos = new Set<string>();

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const idNetsuite = row[idNetsuiteIndex]?.toString().trim();
        const nombre = row[nombreIndex]?.toString().trim();
        const tipo = row[tipoIndex]?.toString().trim();

        if (!idNetsuite || !nombre || !tipo) {
          setImportError(`Error en la fila ${i + 1}: Faltan datos requeridos`);
          return;
        }
        if (!/^[1-9][0-9]*$/.test(idNetsuite)) {
          setImportError(`Error en la fila ${i + 1}: El ID Netsuite debe ser un número entero positivo`);
          return;
        }
        if (idNetsuiteExistentes.has(idNetsuite)) {
          setImportError(`Error en la fila ${i + 1}: El ID Netsuite ${idNetsuite} ya existe`);
          return;
        }
        if (idNetsuiteNuevos.has(idNetsuite)) {
          setImportError(`Error en la fila ${i + 1}: El ID Netsuite ${idNetsuite} está duplicado en el archivo`);
          return;
        }

        preview.push({
          id: `cc-${Date.now()}-${i}`,
          idNetsuite,
          nombre,
          tipo
        });

        idNetsuiteNuevos.add(idNetsuite);
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
    previewData.forEach(centro => {
      agregarCentroCosto(centro);
    });
    setPreviewData([]);
    setIsImportDialogOpen(false);
  };

  const handleDeleteCentro = (centro: CentroCosto) => {
    // Verificar si el centro de costo está siendo utilizado en algún informe
    const informesUsandoCentro = formatos.filter(formato => {
      const buscarCentroEnNodos = (nodos: Nodo[]): boolean => {
        return nodos.some(nodo => {
          // Verificar si el centro de costo está siendo utilizado por su idNetsuite
          if (nodo.centrosCosto && centro.idNetsuite && nodo.centrosCosto.includes(centro.idNetsuite)) {
            return true;
          }
          if (nodo.hijos.length > 0) {
            return buscarCentroEnNodos(nodo.hijos);
          }
          return false;
        });
      };
      return buscarCentroEnNodos(formato.estructura);
    });

    if (informesUsandoCentro.length > 0) {
      setDeleteConfirmation({
        isOpen: true,
        title: 'No se puede eliminar el centro de costo',
        message: (
          <div className="space-y-4">
            <div className="text-red-600 font-medium">
              El centro de costo "{centro.nombre}" no se puede eliminar porque está siendo utilizado en los siguientes informes:
            </div>
            <div className="bg-red-50 p-4 rounded-md">
              <ul className="list-disc pl-5 space-y-1">
                {informesUsandoCentro.map(f => (
                  <li key={f.id} className="text-gray-700">{f.nombre}</li>
                ))}
              </ul>
            </div>
            <div className="text-sm text-gray-600">
              Por favor, elimine el centro de costo de estos informes antes de intentar eliminarlo del catálogo.
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
      title: 'Eliminar Centro de Costo',
      message: `¿Estás seguro de eliminar el centro de costo "${centro.nombre}"? Esta acción no se puede deshacer.`,
      onConfirm: () => {
        eliminarCentroCosto(centro.id);
        setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
      },
      showConfirmButton: true
    });
  };

  const handleSaveCentro = (centro: CentroCosto) => {
    if (editingCentro) {
      actualizarCentroCosto(centro.id, centro);
    } else {
      agregarCentroCosto(centro);
    }
    setEditingCentro(null);
    setIsAddCentroDialogOpen(false);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-none px-6 pt-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Centros de Costo</h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsAddCentroDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Agregar Centro
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Importar
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
                {Array.from(tiposCentro).sort().map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Buscar por nombre, tipo o ID Netsuite..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">ID Netsuite</th>
              <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleSort('nombre')}>
                <div className="flex items-center gap-1">
                  Nombre
                  {getSortIcon('nombre')}
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
        </table>
      </div>

      <div className="flex-1 px-6 pb-6 overflow-auto">
        <table className="w-full">
          <tbody>
            {getSortedCentrosCosto().map((centro) => (
              <tr key={centro.id} className="border-t border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                <td className="px-4 py-2">{centro.idNetsuite}</td>
                <td className="px-4 py-2">{centro.nombre}</td>
                <td className="px-4 py-2">{centro.tipo}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingCentro(centro);
                        setIsAddCentroDialogOpen(true);
                      }}
                      className="hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
                    >
                      <Pencil className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCentro(centro)}
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

      <AddCentroCostoDialog
        isOpen={isAddCentroDialogOpen}
        onClose={() => {
          setIsAddCentroDialogOpen(false);
          setEditingCentro(null);
        }}
        centroToEdit={editingCentro}
        onSave={handleSaveCentro}
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
            <DialogTitle>Importar centros de costo</DialogTitle>
            <DialogDescription>
              <div className="space-y-4">
                <p>Para importar centros de costo desde un archivo Excel, siga estas indicaciones:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>El archivo debe estar en formato Excel (.xlsx)</li>
                  <li>La primera fila debe contener los nombres de las columnas</li>
                  <li>Las columnas requeridas son: ID Netsuite, Nombre y Tipo</li>
                  <li>No se permiten filas vacías entre los datos</li>
                  <li>Ejemplo de estructura:</li>
                </ul>
                <div className="bg-gray-100 p-4 rounded text-sm">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="border p-2">ID Netsuite</th>
                        <th className="border p-2">Nombre</th>
                        <th className="border p-2">Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border p-2">1001</td>
                        <td className="border p-2">Administración</td>
                        <td className="border p-2">Administrativo</td>
                      </tr>
                      <tr>
                        <td className="border p-2">1002</td>
                        <td className="border p-2">Ventas</td>
                        <td className="border p-2">Comercial</td>
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
                Solo se aceptan archivos .xlsx
              </p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx"
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
                      <th className="text-left p-2">ID Netsuite</th>
                      <th className="text-left p-2">Nombre</th>
                      <th className="text-left p-2">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((centro, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{centro.idNetsuite}</td>
                        <td className="p-2">{centro.nombre}</td>
                        <td className="p-2">{centro.tipo}</td>
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

      <DeleteConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
        onConfirm={deleteConfirmation.onConfirm}
        title={deleteConfirmation.title}
        message={deleteConfirmation.message}
        showConfirmButton={deleteConfirmation.showConfirmButton}
      />
    </div>
  );
}; 