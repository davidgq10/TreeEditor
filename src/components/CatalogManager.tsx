import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem } from './ui/select';
import { Pencil, Trash2, ChevronUp, ChevronDown, Plus, Upload } from 'lucide-react';
import { useAppStore } from '../store';
import { CuentaContable, Nodo } from '../types';
import { AddCuentaDialog } from './AddCuentaDialog';
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
import { Input } from './ui/input';
import { v4 as uuidv4 } from 'uuid';

type SortField = 'codigo' | 'nombre' | 'naturaleza';
type SortDirection = 'asc' | 'desc';

export const CatalogManager: React.FC = () => {
  const { cuentas, agregarCuenta, eliminarCuenta, actualizarCuenta, centrosCosto, centrosCostoDefault, formatos } = useAppStore();
  const [editingCuenta, setEditingCuenta] = useState<CuentaContable | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAddCuentaDialogOpen, setIsAddCuentaDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<CuentaContable[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Partial<CuentaContable>>({
    codigo: '',
    nombre: '',
    naturaleza: 'gasto' as const
  });
  const [sortField, setSortField] = useState<SortField>('codigo');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterNaturaleza, setFilterNaturaleza] = useState<'gasto' | 'ingreso' | 'todos'>('todos');
  const [openCombobox, setOpenCombobox] = useState(false);
  const [tiposCuenta, setTiposCuenta] = useState<Set<'gasto' | 'ingreso'>>(new Set());
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
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Función para obtener tipos únicos de cuenta existentes
  const actualizarTiposCuenta = () => {
    const tipos = new Set<'gasto' | 'ingreso'>();
    cuentas.forEach(cuenta => {
      if (cuenta.naturaleza) {
        tipos.add(cuenta.naturaleza);
      }
    });
    setTiposCuenta(tipos);
  };

  // Actualizar tipos cuando cambian las cuentas
  React.useEffect(() => {
    actualizarTiposCuenta();
  }, [cuentas]);


  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };


  const getSortedAndFilteredCuentas = () => {
    let filtered = cuentas;
    
    if (filterNaturaleza !== 'todos') {
      filtered = filtered.filter(cuenta => cuenta.naturaleza === filterNaturaleza);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(cuenta => 
        cuenta.codigo.toLowerCase().includes(term) || 
        cuenta.nombre.toLowerCase().includes(term)
      );
    }

    return [...filtered].sort((a, b) => {
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
      const codigoIndex = headers.findIndex(h => h === 'codigo' || h === 'código');
      const nombreIndex = headers.findIndex(h => h === 'nombre');
      const tipoIndex = headers.findIndex(h => h === 'tipo' || h === 'naturaleza');

      if (codigoIndex === -1 || nombreIndex === -1 || tipoIndex === -1) {
        setImportError('El archivo debe contener exactamente las columnas: Código, Nombre y Tipo');
        return;
      }

      const preview: CuentaContable[] = [];
      const codigosExistentes = new Set(cuentas.map(c => c.codigo));
      const codigosNuevos = new Set<string>();

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const codigo = row[codigoIndex]?.toString().trim();
        const nombre = row[nombreIndex]?.toString().trim();
        const tipo = row[tipoIndex]?.toString().toLowerCase().trim() || 'gasto';

        if (!codigo || !nombre) {
          setImportError(`Error en la fila ${i + 1}: Los campos Código y Nombre son obligatorios`);
          return;
        }

        if (codigosExistentes.has(codigo)) {
          setImportError(`Error en la fila ${i + 1}: El código ${codigo} ya existe en el catálogo de cuentas`);
          return;
        }

        if (codigosNuevos.has(codigo)) {
          setImportError(`Error en la fila ${i + 1}: El código ${codigo} está duplicado en el archivo`);
          return;
        }

        preview.push({
          id: codigo,
          codigo,
          nombre,
          naturaleza: tipo as 'gasto' | 'ingreso'
        });

        codigosNuevos.add(codigo);
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
    previewData.forEach(cuenta => {
      agregarCuenta(cuenta);
    });
    setPreviewData([]);
    setIsImportDialogOpen(false);
  };

  const handleDeleteCuenta = (cuenta: CuentaContable) => {
    // Verificar si la cuenta está siendo utilizada en algún informe
    const informesUsandoCuenta = formatos.filter(formato => {
      const buscarCuentaEnNodos = (nodos: Nodo[]): boolean => {
        for (const nodo of nodos) {
          if (nodo.tipo === 'cuenta' && (nodo.cuentaId === cuenta.id || nodo.cuenta?.id === cuenta.id)) {
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
      setDeleteConfirmation({
        isOpen: true,
        title: 'No se puede eliminar la cuenta',
        message: (
          <div className="space-y-4">
            <div className="text-red-600 font-medium">
              La cuenta "{cuenta.nombre}" ({cuenta.codigo}) no se puede eliminar porque está siendo utilizada en los siguientes informes:
            </div>
            <div className="bg-red-50 p-4 rounded-md">
              <ul className="list-disc pl-5 space-y-1">
                {informesUsandoCuenta.map(f => (
                  <li key={f.id} className="text-gray-700">{f.nombre}</li>
                ))}
              </ul>
            </div>
            <div className="text-sm text-gray-600">
              Por favor, elimine la cuenta de estos informes antes de intentar eliminarla del catálogo.
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

    // Mostrar diálogo de confirmación si la cuenta no está siendo utilizada
    setDeleteConfirmation({
      isOpen: true,
      title: 'Eliminar Cuenta Contable',
      message: `¿Estás seguro de eliminar la cuenta "${cuenta.nombre}" (${cuenta.codigo})? Esta acción no se puede deshacer.`,
      onConfirm: () => {
        try {
          eliminarCuenta(cuenta.id);
          setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          // Si hay un error al eliminar (por ejemplo, la cuenta está en uso)
          setDeleteConfirmation({
            isOpen: true,
            title: 'Error al eliminar la cuenta',
            message: (
              <div className="space-y-4">
                <div className="text-red-600 font-medium">
                  No se pudo eliminar la cuenta "{cuenta.nombre}" ({cuenta.codigo})
                </div>
                <div className="text-sm text-gray-600">
                  {error instanceof Error ? error.message : 'La cuenta está siendo utilizada en informes.'}
                </div>
              </div>
            ),
            onConfirm: () => {
              setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
            },
            showConfirmButton: false
          });
        }
      },
      showConfirmButton: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!formData.codigo || !formData.nombre || !formData.naturaleza) {
        throw new Error('Todos los campos son requeridos');
      }

      // Validar código duplicado
      const codigoExistente = cuentas.some(cuenta => 
        cuenta.codigo.toLowerCase() === formData.codigo?.toLowerCase() && 
        cuenta.id !== editingCuenta?.id
      );

      if (codigoExistente) {
        setError('Ya existe una cuenta con este código');
        return;
      }

      const cuenta: CuentaContable = {
        id: editingCuenta?.id || uuidv4(),
        codigo: formData.codigo,
        nombre: formData.nombre,
        naturaleza: formData.naturaleza
      };

      if (editingCuenta) {
        actualizarCuenta(editingCuenta.id, cuenta);
      } else {
        agregarCuenta(cuenta);
      }
      setIsAddCuentaDialogOpen(false);
      setEditingCuenta(null);
    } catch (error) {
      console.error('Error al guardar la cuenta:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-none px-6 pt-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Catálogo de Cuentas</h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsAddCuentaDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Agregar Cuenta
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
            <Select value={filterNaturaleza} onValueChange={(value: 'gasto' | 'ingreso' | 'todos') => setFilterNaturaleza(value)}>
              <SelectTrigger className="w-[200px]">
                {filterNaturaleza === 'todos' 
                  ? 'Todos los tipos' 
                  : filterNaturaleza.charAt(0).toUpperCase() + filterNaturaleza.slice(1)}
              </SelectTrigger>
              <SelectContent className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <SelectItem value="todos">Todos los tipos</SelectItem>
                {Array.from(tiposCuenta).sort().map((tipo) => (
                  <SelectItem key={tipo} value={tipo as 'gasto' | 'ingreso'}>
                    {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Buscar por código o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleSort('codigo')}>
                <div className="flex items-center gap-1">
                  Código
                  {getSortIcon('codigo')}
                </div>
              </th>
              <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleSort('nombre')}>
                <div className="flex items-center gap-1">
                  Nombre
                  {getSortIcon('nombre')}
                </div>
              </th>
              <th className="px-4 py-2 text-left">Descripción completa</th>
              <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleSort('naturaleza')}>
                <div className="flex items-center gap-1">
                  Tipo
                  {getSortIcon('naturaleza')}
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
            {getSortedAndFilteredCuentas().map((cuenta) => {
              return (
                <tr key={cuenta.id} className="border-t">
                  <td className="px-4 py-2">{cuenta.codigo}</td>
                  <td className="px-4 py-2">{cuenta.nombre}</td>
                  <td className="px-4 py-2">{`${cuenta.codigo} ${cuenta.nombre}`}</td>
                  <td className="px-4 py-2 capitalize">{cuenta.naturaleza}</td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCuenta(cuenta)}
                      className="mr-2"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCuenta(cuenta)}
                      className="hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AddCuentaDialog
        isOpen={isAddCuentaDialogOpen || !!editingCuenta}
        onClose={() => {
          setIsAddCuentaDialogOpen(false);
          setEditingCuenta(null);
        }}
        onSave={(cuenta, centros) => {
          if (editingCuenta) {
            actualizarCuenta(editingCuenta.id, cuenta);
          } else {
            agregarCuenta(cuenta);
          }
          setIsAddCuentaDialogOpen(false);
          setEditingCuenta(null);
        }}
        cuentaToEdit={editingCuenta}
        centrosCosto={[]}
        centrosCostoDefault={[]}
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
            <DialogTitle>Importar cuentas contables</DialogTitle>
            <DialogDescription>
              <div className="space-y-4">
                <p>Para importar cuentas contables desde un archivo Excel, siga estas indicaciones:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>El archivo debe estar en formato Excel (.xlsx)</li>
                  <li>La primera fila debe contener los nombres de las columnas</li>
                  <li>Las columnas requeridas son: Código, Nombre y Tipo</li>
                  <li>No se permiten filas vacías entre los datos</li>
                  <li>Ejemplo de estructura:</li>
                </ul>
                <div className="bg-gray-100 p-4 rounded text-sm">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="border p-2">Código</th>
                        <th className="border p-2">Nombre</th>
                        <th className="border p-2">Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border p-2">1001</td>
                        <td className="border p-2">Caja</td>
                        <td className="border p-2">gasto</td>
                      </tr>
                      <tr>
                        <td className="border p-2">2001</td>
                        <td className="border p-2">Proveedores</td>
                        <td className="border p-2">ingreso</td>
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
                      <th className="text-left p-2">Código</th>
                      <th className="text-left p-2">Nombre</th>
                      <th className="text-left p-2">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((cuenta, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{cuenta.codigo}</td>
                        <td className="p-2">{cuenta.nombre}</td>
                        <td className="p-2">{cuenta.naturaleza}</td>
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