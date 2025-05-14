/**
 * Componente: AddCentroCostoDialog
 * 
 * Descripción:
 * Este componente implementa un diálogo modal para agregar o editar centros de costo.
 * Permite crear nuevos centros de costo o modificar los existentes, incluyendo la gestión
 * de tipos de centros de costo.
 * 
 * Ubicación de renderizado:
 * - Es llamado desde CentroCostoManager.tsx cuando se necesita agregar o editar un centro de costo
 * 
 * Funcionalidad:
 * 1. Muestra un formulario para ingresar nombre y tipo del centro de costo
 * 2. Permite seleccionar tipos predefinidos o agregar nuevos tipos
 * 3. Valida los campos requeridos antes de guardar
 * 4. Maneja tanto la creación como la edición de centros de costo
 * 
 * Props:
 * - isOpen: boolean - Controla la visibilidad del diálogo
 * - onClose: () => void - Función para cerrar el diálogo
 * - centroToEdit: CentroCosto | null - Datos del centro a editar (null si es nuevo)
 * - onSave: (centro: CentroCosto) => void - Función para guardar los cambios
 */

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { CentroCosto } from '../types';
import { Select, SelectContent, SelectItem, SelectTrigger } from './ui/select';
import { Plus } from 'lucide-react';
import { useAppStore } from '../store';

interface AddCentroCostoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  centroToEdit: CentroCosto | null;
  onSave: (centro: CentroCosto) => void;
}

export const AddCentroCostoDialog: React.FC<AddCentroCostoDialogProps> = ({
  isOpen,
  onClose,
  centroToEdit,
  onSave,
}) => {
  const centrosCosto = useAppStore(state => state.centrosCosto);
  // Estado para manejar los datos del formulario
  const [formData, setFormData] = React.useState<Partial<CentroCosto>>({
    idNetsuite: '',
    nombre: '',
    tipo: ''
  });
  const [formErrors, setFormErrors] = useState<{
    idNetsuite: string | null;
    nombre: string | null;
    tipo: string | null;
  }>({
    idNetsuite: null,
    nombre: null,
    tipo: null
  });

  // Estado para manejar los tipos de centros de costo disponibles
  const [tiposCentro, setTiposCentro] = useState<Set<string>>(new Set(['LOCALES', 'COMERCIAL', 'PRODUCCION', 'CDA']));
  
  // Estado para controlar el diálogo de agregar nuevo tipo
  const [isAddTipoDialogOpen, setIsAddTipoDialogOpen] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState('');

  // Efecto para inicializar el formulario cuando se edita un centro existente
  useEffect(() => {
    if (centroToEdit) {
      setFormData({
        idNetsuite: centroToEdit.idNetsuite,
        nombre: centroToEdit.nombre,
        tipo: centroToEdit.tipo
      });
      if (centroToEdit.tipo && !tiposCentro.has(centroToEdit.tipo)) {
        setTiposCentro(new Set([...tiposCentro, centroToEdit.tipo]));
      }
    } else {
      setFormData({
        idNetsuite: '',
        nombre: '',
        tipo: ''
      });
    }
    // Limpiar todos los errores
    setFormErrors({
      idNetsuite: null,
      nombre: null,
      tipo: null
    });
  }, [centroToEdit]);

  // Validación de campos
  const validateIdNetsuite = (idNetsuite: string | undefined) => {
    if (!idNetsuite) return 'El campo ID Netsuite es obligatorio';
    if (!/^[1-9][0-9]*$/.test(idNetsuite)) return 'El ID Netsuite debe ser un número entero positivo';
    const idExists = centrosCosto.some(c => c.idNetsuite === idNetsuite && (!centroToEdit || c.id !== centroToEdit.id));
    if (idExists) return 'El ID Netsuite ya existe';
    return null;
  };
  
  const validateNombre = (nombre: string | undefined) => {
    if (!nombre || !nombre.trim()) return 'El campo Nombre es obligatorio';
    return null;
  };
  
  const validateTipo = (tipo: string | undefined) => {
    if (!tipo || !tipo.trim()) return 'El campo Tipo es obligatorio';
    return null;
  };

  // Función para manejar el envío del formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar todos los campos obligatorios
    const idNetsuiteError = validateIdNetsuite(formData.idNetsuite);
    const nombreError = validateNombre(formData.nombre);
    const tipoError = validateTipo(formData.tipo);
    
    // Establecer errores de validación
    setFormErrors({
      idNetsuite: idNetsuiteError,
      nombre: nombreError,
      tipo: tipoError
    });
    
    // Si hay algún error, detener el envío del formulario
    if (idNetsuiteError || nombreError || tipoError) {
      return;
    }
    
    // Asegurarse de que todos los campos sean string
    const centro: CentroCosto = {
      id: centroToEdit?.id || `cc-${Date.now()}`,
      idNetsuite: String(formData.idNetsuite || ''),
      nombre: String(formData.nombre || ''),
      tipo: String(formData.tipo || '')
    };
    onSave(centro);
    onClose();
  };

  // Función para agregar un nuevo tipo de centro de costo
  const handleAddTipo = () => {
    if (nuevoTipo.trim()) {
      const tipoLower = nuevoTipo.trim();
      setTiposCentro(new Set([...tiposCentro, tipoLower]));
      setFormData({ ...formData, tipo: tipoLower });
      setNuevoTipo('');
      setIsAddTipoDialogOpen(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {centroToEdit ? 'Editar Centro de Costo' : 'Agregar Centro de Costo'}
            </DialogTitle>
            <DialogDescription>
              Complete los campos requeridos para {centroToEdit ? 'editar' : 'agregar'} el centro de costo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="idNetsuite">ID Netsuite *</Label>
              <Input
                id="idNetsuite"
                type="number"
                min={1}
                value={formData.idNetsuite}
                onChange={e => {
                  setFormData({ ...formData, idNetsuite: e.target.value.replace(/[^0-9]/g, '') });
                  setFormErrors(prev => ({ ...prev, idNetsuite: null }));
                }}
                placeholder="Ej: 1001"
                className={formErrors.idNetsuite ? 'border-red-500' : ''}
              />
              {formErrors.idNetsuite && <div className="text-red-600 text-xs mt-1">{formErrors.idNetsuite}</div>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => {
                  setFormData({ ...formData, nombre: e.target.value });
                  setFormErrors(prev => ({ ...prev, nombre: null }));
                }}
                placeholder="Ej: Administración"
                className={formErrors.nombre ? 'border-red-500' : ''}
              />
              {formErrors.nombre && <div className="text-red-600 text-xs mt-1">{formErrors.nombre}</div>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => {
                    setFormData({ ...formData, tipo: value });
                    setFormErrors(prev => ({ ...prev, tipo: null }));
                  }}
                >
                  <SelectTrigger className={formErrors.tipo ? 'border-red-500' : ''}>
                    {formData.tipo || "Selecciona el tipo"}
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(tiposCentro).sort().map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setIsAddTipoDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formErrors.tipo && <div className="text-red-600 text-xs mt-1">{formErrors.tipo}</div>}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                {centroToEdit ? 'Guardar cambios' : 'Agregar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddTipoDialogOpen} onOpenChange={setIsAddTipoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Tipo</DialogTitle>
            <DialogDescription>
              Ingrese el nombre del nuevo tipo de centro de costo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={nuevoTipo}
              onChange={(e) => setNuevoTipo(e.target.value)}
              placeholder="Ej: Logística"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddTipoDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddTipo}>
                Agregar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}; 