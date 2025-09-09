import React, { useState, useEffect } from 'react';
import { TreeEditor } from './components/TreeEditor';
import { CatalogManager } from './components/CatalogManager';
import { CentroCostoManager } from './components/CentroCostoManager';
import { DepartamentoManager } from './components/DepartamentoManager';
import { AccountGroupManager } from './components/AccountGroupManager';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { useAppStore } from './store';
import { ChevronLeft, ChevronRight, Plus, Upload, Download, Building2, Users, FileText, Menu, Pencil, Trash2, Book, FolderOpen } from 'lucide-react';
import { Formato } from './types';
import { importFromExcel } from './services/excel';
import { ThemeSelector } from './components/ThemeSelector';
import './theme.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './components/ui/dialog';
import { DeleteConfirmationDialog } from './components/DeleteConfirmationDialog';
import logoSpoon from './assets/logo-spoon.jpg';

export const App: React.FC = () => {
  const [showCatalog, setShowCatalog] = useState(false);
  const [showCentrosCosto, setShowCentrosCosto] = useState(false);
  const [showDepartamentos, setShowDepartamentos] = useState(false);
  const [showGruposCuentas, setShowGruposCuentas] = useState(false);
  const [formatosCollapsed, setFormatosCollapsed] = useState(false);
  const [showNewFormDialog, setShowNewFormDialog] = useState(false);
  const [showEditFormDialog, setShowEditFormDialog] = useState(false);
  const [newFormName, setNewFormName] = useState('');
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [editingFormName, setEditingFormName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportWarning, setShowImportWarning] = useState(false);
  const {
    formatos,
    formatoActual,
    agregarFormato,
    seleccionarFormato,
    eliminarFormato,
    actualizarFormato
  } = useAppStore();


  const handleNewFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFormName.trim()) {
      agregarFormato(newFormName.trim());
      setNewFormName('');
      setShowNewFormDialog(false);
    }
  };

  const handleEditForm = (formato: { id: string; nombre: string }) => {
    setEditingFormId(formato.id);
    setEditingFormName(formato.nombre);
    setShowEditFormDialog(true);
  };

  const handleEditFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFormId && editingFormName.trim()) {
      actualizarFormato(editingFormId, editingFormName.trim());
      setShowEditFormDialog(false);
    }
  };

  const handleDeleteFormato = (formato: Formato) => {
    setDeleteConfirmation({
      isOpen: true,
      title: 'Eliminar Formato',
      message: `¿Estás seguro de eliminar el formato "${formato.nombre}"? Esta acción no se puede deshacer.`,
      onConfirm: () => {
        eliminarFormato(formato.id);
        setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleViewChange = (view: 'formatos' | 'catalogo' | 'centros' | 'departamentos' | 'grupos') => {
    setShowCatalog(view === 'catalogo');
    setShowCentrosCosto(view === 'centros');
    setShowDepartamentos(view === 'departamentos');
    setShowGruposCuentas(view === 'grupos');
  };

  const handleImportClick = () => {
    setShowImportWarning(true);
  };

  const handleImportConfirm = () => {
    setShowImportWarning(false);
    document.getElementById('import-file')?.click();
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const { formato } = await importFromExcel({
        file,
        centrosCostoList: useAppStore.getState().centrosCosto,
        departamentosList: useAppStore.getState().departamentos
      });
      
      // Agregar el nuevo formato importado
      const nuevoFormato: Formato = {
        id: formato.id,
        nombre: formato.nombre,
        estructura: formato.estructura,
        centrosCostoDefault: formato.centrosCostoDefault,
        departamentosDefault: formato.departamentosDefault
      };
      
      agregarFormato(nuevoFormato);
      setShowImportModal(true);
    } catch (error) {
      console.error('Error al importar el archivo:', error);
      setImportError(error instanceof Error ? error.message : 'Error desconocido al importar el archivo');
      setShowImportModal(true);
    } finally {
      setIsImporting(false);
      // Limpiar el input file para permitir seleccionar el mismo archivo de nuevo
      event.target.value = '';
    }
  };

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm fixed top-0 left-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={logoSpoon} alt="Logo Spoon" style={{ height: '40px', width: 'auto' }} className="block" />
              <h1 className="text-xl font-bold text-theme-primary">Editor de Formatos Financieros</h1>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative">
                <button
                  className={`flex items-center px-4 py-2 ${!showCatalog && !showCentrosCosto && !showDepartamentos && !showGruposCuentas ? 'font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                  style={!showCatalog && !showCentrosCosto && !showDepartamentos && !showGruposCuentas ? { color: 'var(--theme-primary)', borderBottom: '3px solid var(--theme-primary)' } : {}}
                  onClick={() => handleViewChange('formatos')}
                >
                  <FileText 
                    className="w-4 h-4 mr-2" 
                    style={!showCatalog && !showCentrosCosto && !showDepartamentos && !showGruposCuentas ? { color: 'var(--theme-primary)' } : {}} 
                  />
                  Formatos
                </button>
              </div>
              <div className="relative">
                <button
                  className={`flex items-center px-4 py-2 ${showCatalog ? 'font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                  style={showCatalog ? { color: 'var(--theme-primary)', borderBottom: '3px solid var(--theme-primary)' } : {}}
                  onClick={() => handleViewChange('catalogo')}
                >
                  <Book 
                    className="w-4 h-4 mr-2" 
                    style={showCatalog ? { color: 'var(--theme-primary)' } : {}} 
                  />
                  Cuentas contables
                </button>
              </div>
              <div className="relative">
                <button
                  className={`flex items-center px-4 py-2 ${showGruposCuentas ? 'font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                  style={showGruposCuentas ? { color: 'var(--theme-primary)', borderBottom: '3px solid var(--theme-primary)' } : {}}
                  onClick={() => handleViewChange('grupos')}
                >
                  <FolderOpen 
                    className="w-4 h-4 mr-2" 
                    style={showGruposCuentas ? { color: 'var(--theme-primary)' } : {}} 
                  />
                  Grupos de Cuentas
                </button>
              </div>
              <div className="relative">
                <button
                  className={`flex items-center px-4 py-2 ${showCentrosCosto ? 'font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                  style={showCentrosCosto ? { color: 'var(--theme-primary)', borderBottom: '3px solid var(--theme-primary)' } : {}}
                  onClick={() => handleViewChange('centros')}
                >
                  <Building2 
                    className="w-4 h-4 mr-2" 
                    style={showCentrosCosto ? { color: 'var(--theme-primary)' } : {}} 
                  />
                  Centros de Costo
                </button>
              </div>
              <div className="relative">
                <button
                  className={`flex items-center px-4 py-2 ${showDepartamentos ? 'font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                  style={showDepartamentos ? { color: 'var(--theme-primary)', borderBottom: '3px solid var(--theme-primary)' } : {}}
                  onClick={() => handleViewChange('departamentos')}
                >
                  <Users 
                    className="w-4 h-4 mr-2" 
                    style={showDepartamentos ? { color: 'var(--theme-primary)' } : {}} 
                  />
                  Departamentos
                </button>
              </div>
              <div className="ml-4">
                <ThemeSelector />
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-24">
        {showCatalog ? (
          <CatalogManager />
        ) : showGruposCuentas ? (
          <AccountGroupManager />
        ) : showCentrosCosto ? (
          <CentroCostoManager />
        ) : showDepartamentos ? (
          <DepartamentoManager />
        ) : (
          <div className="flex flex-col md:flex-row gap-7">
            {/* Lista de Formatos */}
            <div className={`transition-all duration-300 ${formatosCollapsed ? 'w-12' : 'w-80'}`}>
              <div className={`${formatosCollapsed ? 'bg-transparent' : 'bg-white'} border-r border-gray-200 h-full ${formatosCollapsed ? 'p-2' : 'p-4'}`}>
                <Button
                  onClick={() => setFormatosCollapsed(!formatosCollapsed)}
                  variant="ghost"
                  size="sm"
                  className="mb-4 p-2 hover:bg-gray-100 bg-white"
                >
                  <Menu className="w-4 h-4" />
                </Button>
                <div className={`${formatosCollapsed ? 'hidden' : 'block'}`}>
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold mb-3">Formatos</h2>
                    <div className="flex flex-col gap-2">
                      <Dialog open={showNewFormDialog} onOpenChange={setShowNewFormDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full">
                            <Plus className="w-4 h-4 mr-2" />
                            Nuevo
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                          <DialogHeader>
                            <DialogTitle>Nuevo Formato</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleNewFormSubmit} className="space-y-4">
                            <div>
                              <Input
                                type="text"
                                placeholder="Nombre del formato"
                                value={newFormName}
                                onChange={(e) => setNewFormName(e.target.value)}
                                className="w-full"
                              />
                            </div>
                            <div className="flex justify-end">
                              <Button type="submit">Crear</Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isImporting}
                        onClick={handleImportClick}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {isImporting ? 'Importando...' : 'Importar'}
                      </Button>
                      <input
                        id="import-file"
                        type="file"
                        accept=".xlsx"
                        className="hidden"
                        onChange={handleImport}
                        disabled={isImporting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {formatos.map((formato) => (
                      <div
                        key={formato.id}
                        className={`
                          flex justify-between items-center p-2 rounded
                          ${formatoActual === formato.id ? 'active-item' : 'hover-effect'}
                          cursor-pointer border
                        `}
                        onClick={() => seleccionarFormato(formato.id)}
                      >
                        <span>{formato.nombre}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditForm(formato);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFormato(formato);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Editor de Árbol */}
            <div className={`flex-grow bg-white rounded-lg shadow overflow-hidden transition-all duration-300 ${formatosCollapsed ? 'ml-4' : ''}`} style={{ maxWidth: formatosCollapsed ? 'calc(100vw - 120px)' : 'calc(100% + 20%)' }}>
              <TreeEditor />
            </div>
          </div>
        )}
      </div>

      {/* Diálogo de edición de formato */}
      <Dialog open={showEditFormDialog} onOpenChange={setShowEditFormDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Formato</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditFormSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Nombre del formato"
                value={editingFormName}
                onChange={(e) => setEditingFormName(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
        onConfirm={deleteConfirmation.onConfirm}
        title={deleteConfirmation.title}
        message={deleteConfirmation.message}
      />

      {/* Modal de advertencia de importación */}
      <Dialog open={showImportWarning} onOpenChange={setShowImportWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Advertencia de Importación</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Requisito importante para la importación
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      <strong>Solo se pueden importar archivos que NO hayan sido exportados con la función "Excel Desnormalizado".</strong>
                    </p>
                    <p className="mt-2">
                      Si el archivo fue exportado usando la opción "Excel Desnormalizado" (que expande las combinaciones de centros de costo y departamentos), 
                      la importación no funcionará correctamente y podría generar datos incorrectos.
                    </p>
                    <p className="mt-2">
                      Asegúrese de usar únicamente archivos exportados con la función "Excel" estándar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowImportWarning(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleImportConfirm}>
              Continuar con la importación
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de resultado de importación */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{importError ? 'Error al importar' : 'Importación exitosa'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {importError ? (
              <p className="text-red-600">{importError}</p>
            ) : (
              <p className="text-green-600">El archivo se ha importado correctamente.</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowImportModal(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};