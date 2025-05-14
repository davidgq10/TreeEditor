import React, { useState } from 'react';
import { TreeEditor } from './components/TreeEditor';
import { CatalogManager } from './components/CatalogManager';
import { CentroCostoManager } from './components/CentroCostoManager';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { useAppStore } from './store';
import { Plus, Book, Pencil, Trash2, Building2, FileText, Upload } from 'lucide-react';
import { Formato } from './types';
import { importFromExcel } from './services/excel';
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
  const [showNewFormDialog, setShowNewFormDialog] = useState(false);
  const [showEditFormDialog, setShowEditFormDialog] = useState(false);
  const [newFormName, setNewFormName] = useState('');
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [editingFormName, setEditingFormName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
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

  const handleViewChange = (view: 'formatos' | 'catalogo' | 'centros') => {
    setShowCatalog(view === 'catalogo');
    setShowCentrosCosto(view === 'centros');
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const { formato } = await importFromExcel({
        file,
        centrosCostoList: useAppStore.getState().centrosCosto
      });
      
      // Obtener el nombre del archivo sin la extensión
      const fileName = file.name.replace(/\.xlsx?$/i, '');
      // Crear un nuevo formato con el nombre del archivo
      const nuevoFormato = {
        ...formato,
        nombre: fileName
      };
      
      // Agregar el nuevo formato importado
      agregarFormato(nuevoFormato);
      setShowImportModal(true);
    } catch (error) {
      console.error('Error al importar el archivo:', error);
      setImportError(error instanceof Error ? error.message : 'Error desconocido al importar el archivo');
      setShowImportModal(true);
    } finally {
      setIsImporting(false);
      // Limpiar el input para permitir volver a seleccionar el mismo archivo
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
              <h1 className="text-xl font-bold text-gray-900">Editor de Formatos Financieros</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={!showCatalog && !showCentrosCosto ? "default" : "outline"}
                onClick={() => handleViewChange('formatos')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Formatos
              </Button>
              <Button
                variant={showCatalog ? "default" : "outline"}
                onClick={() => handleViewChange('catalogo')}
              >
                <Book className="w-4 h-4 mr-2" />
                Cuentas contables
              </Button>
              <Button
                variant={showCentrosCosto ? "default" : "outline"}
                onClick={() => handleViewChange('centros')}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Centros de Costo
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-24">
        {showCatalog ? (
          <CatalogManager />
        ) : showCentrosCosto ? (
          <CentroCostoManager />
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Lista de Formatos */}
            <div className="col-span-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Formatos</h2>
                  <div className="flex gap-2">
                    <Dialog open={showNewFormDialog} onOpenChange={setShowNewFormDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
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
                      onClick={() => document.getElementById('import-file')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {isImporting ? 'Importando...' : 'Importar'}
                      <input
                        id="import-file"
                        type="file"
                        accept=".xlsx"
                        className="hidden"
                        onChange={handleImport}
                        disabled={isImporting}
                      />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {formatos.map((formato) => (
                    <div
                      key={formato.id}
                      className={`
                        flex justify-between items-center p-2 rounded
                        ${formatoActual === formato.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}
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

            {/* Editor de Árbol */}
            <div className="col-span-10 bg-white rounded-lg shadow">
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

      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{importError ? 'Error al importar' : 'Importación exitosa'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {importError ? (
              <p className="text-red-600">{importError}</p>
            ) : (
              <p>El formato se ha importado correctamente.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};