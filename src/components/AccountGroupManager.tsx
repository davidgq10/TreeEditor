import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Search, Plus, Pencil, Trash2, Users, Calendar, Download, Upload, X } from 'lucide-react';
import { useAppStore } from '../store';
import { GrupoCuentas, CuentaContable } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { exportarGruposCuentasAExcel, importarGruposCuentasDesdeExcel } from '../services/excel';

interface AddEditGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  grupo?: GrupoCuentas | null;
}

const AddEditGroupDialog: React.FC<AddEditGroupDialogProps> = ({ isOpen, onClose, grupo }) => {
  const { cuentas, agregarGrupoCuentas, actualizarGrupoCuentas } = useAppStore();
  const [formData, setFormData] = useState({
    nombre: grupo?.nombre || '',
    descripcion: grupo?.descripcion || '',
    cuentas: grupo?.cuentas || []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [formErrors, setFormErrors] = useState({
    nombre: null as string | null,
    cuentas: null as string | null
  });

  const filteredCuentas = cuentas.filter(cuenta =>
    cuenta.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cuenta.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors = {
      nombre: !formData.nombre.trim() ? 'El nombre es obligatorio' : null,
      cuentas: formData.cuentas.length === 0 ? 'Debe seleccionar al menos una cuenta' : null
    };
    
    setFormErrors(newErrors);
    
    if (newErrors.nombre || newErrors.cuentas) {
      return;
    }

    const grupoData: GrupoCuentas = {
      id: grupo?.id || uuidv4(),
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim(),
      cuentas: formData.cuentas,
      fechaCreacion: grupo?.fechaCreacion || new Date(),
      fechaModificacion: new Date()
    };

    if (grupo) {
      actualizarGrupoCuentas(grupo.id, grupoData);
    } else {
      agregarGrupoCuentas(grupoData);
    }

    onClose();
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      cuentas: []
    });
    setSearchTerm('');
    setFormErrors({
      nombre: null,
      cuentas: null
    });
  };

  const handleCuentaToggle = (cuentaId: string) => {
    setFormData(prev => ({
      ...prev,
      cuentas: prev.cuentas.includes(cuentaId)
        ? prev.cuentas.filter(id => id !== cuentaId)
        : [...prev.cuentas, cuentaId]
    }));
    setFormErrors(prev => ({ ...prev, cuentas: null }));
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredCuentas.map(c => c.id);
    const newSelection = new Set([...formData.cuentas, ...allFilteredIds]);
    setFormData(prev => ({
      ...prev,
      cuentas: Array.from(newSelection)
    }));
    setFormErrors(prev => ({ ...prev, cuentas: null }));
  };

  const handleDeselectAll = () => {
    const filteredIds = new Set(filteredCuentas.map(c => c.id));
    setFormData(prev => ({
      ...prev,
      cuentas: prev.cuentas.filter(id => !filteredIds.has(id))
    }));
  };

  React.useEffect(() => {
    if (grupo) {
      setFormData({
        nombre: grupo.nombre,
        descripcion: grupo.descripcion || '',
        cuentas: grupo.cuentas
      });
    } else {
      resetForm();
    }
  }, [grupo, isOpen]);

  const getSelectedCuentas = () => {
    return formData.cuentas
      .map(id => cuentas.find(c => c.id === id))
      .filter((cuenta): cuenta is CuentaContable => cuenta !== undefined);
  };

  const handleRemoveCuenta = (cuentaId: string) => {
    setFormData(prev => ({
      ...prev,
      cuentas: prev.cuentas.filter(id => id !== cuentaId)
    }));
    setFormErrors(prev => ({ ...prev, cuentas: null }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{grupo ? 'Editar Grupo de Cuentas' : 'Nuevo Grupo de Cuentas'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden" noValidate>
          <div className="space-y-4 mb-4">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium mb-1">
                Nombre del Grupo *
              </label>
              <Input
                id="nombre"
                placeholder="Ingrese el nombre del grupo"
                value={formData.nombre}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, nombre: e.target.value }));
                  setFormErrors(prev => ({ ...prev, nombre: null }));
                }}
                className={formErrors.nombre ? 'border-red-500' : ''}
              />
              {formErrors.nombre && <p className="mt-1 text-sm text-red-500">{formErrors.nombre}</p>}
            </div>
            
            <div>
              <label htmlFor="descripcion" className="block text-sm font-medium mb-1">
                Descripción (Opcional)
              </label>
              <Textarea
                id="descripcion"
                placeholder="Descripción del grupo de cuentas"
                value={formData.descripcion}
                onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex gap-4">
            {/* Panel izquierdo - Selección de cuentas */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">
                  Seleccionar Cuentas * ({formData.cuentas.length} seleccionadas)
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={filteredCuentas.length === 0}
                  >
                    Seleccionar Filtradas
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAll}
                    disabled={filteredCuentas.length === 0}
                  >
                    Deseleccionar Filtradas
                  </Button>
                </div>
              </div>
              
              {formErrors.cuentas && <p className="mb-2 text-sm text-red-500">{formErrors.cuentas}</p>}
              
              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar cuentas por nombre o código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto border rounded-md p-3 space-y-2">
                {filteredCuentas.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    {searchTerm ? 'No se encontraron cuentas' : 'No hay cuentas disponibles'}
                  </p>
                ) : (
                  filteredCuentas.map((cuenta) => (
                    <div key={cuenta.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                      <Checkbox
                        id={cuenta.id}
                        checked={formData.cuentas.includes(cuenta.id)}
                        onCheckedChange={() => handleCuentaToggle(cuenta.id)}
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={cuenta.id}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {cuenta.codigo} - {cuenta.nombre}
                        </label>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {cuenta.naturaleza}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Panel derecho - Cuentas seleccionadas */}
            <div className="w-80 flex flex-col border-l pl-4">
              <div className="mb-3">
                <h3 className="text-sm font-medium mb-2">
                  Cuentas Seleccionadas ({formData.cuentas.length})
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2">
                {formData.cuentas.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      No hay cuentas seleccionadas
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Selecciona cuentas del panel izquierdo
                    </p>
                  </div>
                ) : (
                  getSelectedCuentas().map((cuenta) => (
                    <div key={cuenta.id} className="group">
                      <Badge 
                        variant="outline" 
                        className="w-full justify-between p-2 h-auto hover:bg-gray-50"
                      >
                        <div className="flex-1 text-left">
                          <div className="text-xs font-medium truncate">
                            {cuenta.codigo}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {cuenta.nombre}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-2 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600"
                          onClick={() => handleRemoveCuenta(cuenta.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {grupo ? 'Actualizar' : 'Crear'} Grupo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const AccountGroupManager: React.FC = () => {
  const { gruposCuentas, cuentas, eliminarGrupoCuentas, agregarGrupoCuentas } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GrupoCuentas | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    group: GrupoCuentas | null;
  }>({ isOpen: false, group: null });
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSuccess, setImportSuccess] = useState<{ count: number; grupos: string[] } | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [showExportDialog, setShowExportDialog] = useState(false);

  const filteredGroups = gruposCuentas.filter(grupo =>
    grupo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (grupo.descripcion && grupo.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getCuentasNames = (cuentaIds: string[]): string[] => {
    return cuentaIds
      .map(id => cuentas.find(c => c.id === id))
      .filter((cuenta): cuenta is CuentaContable => cuenta !== undefined)
      .map(cuenta => `${cuenta.codigo} - ${cuenta.nombre}`);
  };

  const handleDeleteGroup = (group: GrupoCuentas) => {
    setDeleteConfirmation({ isOpen: true, group });
  };

  const confirmDelete = () => {
    if (deleteConfirmation.group) {
      eliminarGrupoCuentas(deleteConfirmation.group.id);
      setDeleteConfirmation({ isOpen: false, group: null });
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleExportGroups = async (gruposAExportar?: GrupoCuentas[]) => {
    const grupos = gruposAExportar || gruposCuentas;
    
    if (grupos.length === 0) {
      alert('No hay grupos de cuentas para exportar');
      return;
    }

    setIsExporting(true);
    try {
      const buffer = await exportarGruposCuentasAExcel({
        gruposCuentas: grupos,
        cuentasList: cuentas
      });

      // Crear blob y descargar archivo
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grupos_cuentas_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error al exportar grupos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al exportar los grupos de cuentas: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSelected = async () => {
    const gruposSeleccionados = gruposCuentas.filter(grupo => selectedGroups.has(grupo.id));
    await handleExportGroups(gruposSeleccionados);
    setShowExportDialog(false);
  };

  const handleSelectAllGroups = () => {
    const allIds = new Set(filteredGroups.map(grupo => grupo.id));
    setSelectedGroups(allIds);
  };

  const handleDeselectAllGroups = () => {
    setSelectedGroups(new Set());
  };

  const handleGroupToggle = (groupId: string) => {
    const newSelection = new Set(selectedGroups);
    if (newSelection.has(groupId)) {
      newSelection.delete(groupId);
    } else {
      newSelection.add(groupId);
    }
    setSelectedGroups(newSelection);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const { gruposCuentas: gruposImportados } = await importarGruposCuentasDesdeExcel({
        file,
        cuentasList: cuentas
      });

      // Agregar los grupos importados al store
      let gruposAgregados = 0;
      const nombresGrupos: string[] = [];
      
      gruposImportados.forEach(grupo => {
        // Verificar si ya existe un grupo con el mismo ID
        const grupoExistente = gruposCuentas.find(g => g.id === grupo.id);
        if (!grupoExistente) {
          agregarGrupoCuentas(grupo);
          gruposAgregados++;
          nombresGrupos.push(grupo.nombre);
        } else {
          console.warn(`Grupo con ID ${grupo.id} ya existe, saltando...`);
        }
      });

      if (gruposAgregados > 0) {
        setImportSuccess({ count: gruposAgregados, grupos: nombresGrupos });
      } else {
        setImportError('No se importaron grupos nuevos. Todos los grupos ya existen.');
      }
      
      setShowImportModal(true);
    } catch (error) {
      console.error('Error al importar grupos:', error);
      setImportError(error instanceof Error ? error.message : 'Error desconocido al importar grupos');
      setShowImportModal(true);
    } finally {
      setIsImporting(false);
      // Limpiar el input file para permitir seleccionar el mismo archivo de nuevo
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Grupos de Cuentas</h2>
          <p className="text-gray-600">Administra grupos personalizados de cuentas contables</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowExportDialog(true)}
            disabled={isExporting || gruposCuentas.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>
          <Button
            variant="outline"
            onClick={() => document.getElementById('import-grupos-file')?.click()}
            disabled={isImporting}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isImporting ? 'Importando...' : 'Importar'}
          </Button>
          <input
            id="import-grupos-file"
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleImport}
            disabled={isImporting}
          />
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Grupo
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar grupos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-500">
          {filteredGroups.length} de {gruposCuentas.length} grupos
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredGroups.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 text-center">
                  {searchTerm 
                    ? 'No se encontraron grupos que coincidan con la búsqueda' 
                    : 'No hay grupos de cuentas creados aún'}
                </p>
                {!searchTerm && (
                  <Button 
                    className="mt-4" 
                    onClick={() => setIsAddDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primer Grupo
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredGroups.map((grupo) => (
            <Card key={grupo.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{grupo.nombre}</CardTitle>
                    {grupo.descripcion && (
                      <CardDescription className="mt-1">
                        {grupo.descripcion}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingGroup(grupo)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteGroup(grupo)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    {grupo.cuentas.length} cuenta{grupo.cuentas.length !== 1 ? 's' : ''}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    Creado: {formatDate(grupo.fechaCreacion)}
                  </div>

                  {grupo.cuentas.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500 mb-2">Cuentas incluidas:</p>
                      <div className="space-y-1 max-h-20 overflow-y-auto">
                        {getCuentasNames(grupo.cuentas.slice(0, 3)).map((nombre, index) => (
                          <p key={index} className="text-xs text-gray-700 truncate">
                            {nombre}
                          </p>
                        ))}
                        {grupo.cuentas.length > 3 && (
                          <p className="text-xs text-gray-500">
                            +{grupo.cuentas.length - 3} más...
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AddEditGroupDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
      />

      <AddEditGroupDialog
        isOpen={!!editingGroup}
        onClose={() => setEditingGroup(null)}
        grupo={editingGroup}
      />

      <Dialog 
        open={deleteConfirmation.isOpen} 
        onOpenChange={() => setDeleteConfirmation({ isOpen: false, group: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Grupo de Cuentas</DialogTitle>
          </DialogHeader>
          <p>
            ¿Estás seguro de que deseas eliminar el grupo "{deleteConfirmation.group?.nombre}"?
          </p>
          <p className="text-sm text-gray-600">
            Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmation({ isOpen: false, group: null })}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de resultado de importación */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {importError ? 'Error al importar' : 'Importación exitosa'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {importError ? (
              <div className="space-y-2">
                <p className="text-red-600">{importError}</p>
                <p className="text-sm text-gray-600">
                  Verifique que el archivo tenga el formato correcto y que las cuentas referenciadas existan en el catálogo.
                </p>
              </div>
            ) : importSuccess ? (
              <div className="space-y-2">
                <p className="text-green-600">
                  Se importaron {importSuccess.count} grupo{importSuccess.count !== 1 ? 's' : ''} exitosamente.
                </p>
                {importSuccess.grupos.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Grupos importados:</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {importSuccess.grupos.map((nombre, index) => (
                        <li key={index} className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          {nombre}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowImportModal(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de selección para exportar */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Seleccionar Grupos para Exportar</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                Selecciona los grupos que deseas exportar ({selectedGroups.size} de {gruposCuentas.length} seleccionados)
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllGroups}
                >
                  Seleccionar Todos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAllGroups}
                >
                  Deseleccionar Todos
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border rounded-md p-3 space-y-2">
              {gruposCuentas.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No hay grupos de cuentas disponibles
                </p>
              ) : (
                gruposCuentas.map((grupo) => (
                  <div key={grupo.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded border">
                    <Checkbox
                      id={`export-${grupo.id}`}
                      checked={selectedGroups.has(grupo.id)}
                      onCheckedChange={() => handleGroupToggle(grupo.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={`export-${grupo.id}`}
                        className="text-sm font-medium cursor-pointer block"
                      >
                        {grupo.nombre}
                      </label>
                      {grupo.descripcion && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {grupo.descripcion}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          {grupo.cuentas.length} cuenta{grupo.cuentas.length !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(grupo.fechaCreacion)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExportSelected}
              disabled={selectedGroups.size === 0 || isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exportando...' : `Exportar ${selectedGroups.size} Grupo${selectedGroups.size !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
