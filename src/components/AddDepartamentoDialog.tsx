/**
 * Componente: AddDepartamentoDialog
 * 
 * Descripción:
 * Este componente implementa un diálogo modal para agregar o editar departamentos.
 * Permite crear nuevos departamentos o modificar los existentes.
 * 
 * Ubicación de renderizado:
 * - Es llamado desde DepartamentoManager.tsx cuando se necesita agregar o editar un departamento
 * 
 * Funcionalidad:
 * 1. Muestra un formulario para ingresar nombre y nombre_completo del departamento
 * 2. Valida los campos requeridos antes de guardar
 * 3. Maneja tanto la creación como la edición de departamentos
 * 
 * Props:
 * - isOpen: boolean - Controla la visibilidad del diálogo
 * - onClose: () => void - Función para cerrar el diálogo
 * - deptoToEdit: Departamento | null - Datos del depto a editar (null si es nuevo)
 * - onSave: (depto: Departamento) => void - Función para guardar los cambios
 */

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Departamento } from '../types';
import { useAppStore } from '../store';

interface AddDepartamentoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  deptoToEdit: Departamento | null;
  onSave: (depto: Departamento) => void;
}

export const AddDepartamentoDialog: React.FC<AddDepartamentoDialogProps> = ({
  isOpen,
  onClose,
  deptoToEdit,
  onSave,
}) => {
  const departamentos = useAppStore(state => state.departamentos);
  // Estado para manejar los datos del formulario
  const [formData, setFormData] = React.useState({
    id: '',
    nombre: '',
    nombre_completo: ''
  });
  const [formErrors, setFormErrors] = useState<{
    id: string | null;
    nombre: string | null;
    nombre_completo: string | null;
  }>({ 
    id: null,
    nombre: null,
    nombre_completo: null
   });

  // Efecto para inicializar el formulario cuando se edita un depto existente
  useEffect(() => {
    if (deptoToEdit) {
      setFormData({
        id: String(deptoToEdit.id),
        nombre: deptoToEdit.nombre,
        nombre_completo: deptoToEdit.nombre_completo
      });
    } else {
      setFormData({
        id: '',
        nombre: '',
        nombre_completo: ''
      });
    }
    // Limpiar todos los errores
    setFormErrors({
      id: null,
      nombre: null,
      nombre_completo: null
    });
  }, [deptoToEdit, isOpen]);

  // Validación de campos
  const validateId = (id: string | undefined) => {
    if (!id || !id.trim()) return 'El campo ID es obligatorio';
    if (!/^\d+$/.test(id)) return 'El ID debe ser un número entero.';
    const idNum = parseInt(id, 10);
    const idExists = departamentos.some(d => d.id === idNum && (!deptoToEdit || d.id !== deptoToEdit.id));
    if (idExists) return 'El ID del departamento ya existe';
    return null;
  };

  const validateNombre = (nombre: string | undefined) => {
    if (!nombre || !nombre.trim()) return 'El campo Nombre es obligatorio';
    const nombreExists = departamentos.some(d => d.nombre === nombre && (!deptoToEdit || d.id !== deptoToEdit.id));
    if (nombreExists) return 'El nombre del departamento ya existe';
    return null;
  };
  
  const validateNombreCompleto = (nombre_completo: string | undefined) => {
    if (!nombre_completo || !nombre_completo.trim()) return 'El campo Nombre Completo es obligatorio';
    return null;
  };

  // Función para manejar el envío del formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar todos los campos obligatorios
    const idError = validateId(formData.id);
    const nombreError = validateNombre(formData.nombre);
    const nombreCompletoError = validateNombreCompleto(formData.nombre_completo);
    
    // Establecer errores de validación
    setFormErrors({
      id: idError,
      nombre: nombreError,
      nombre_completo: nombreCompletoError
    });
    
    // Si hay algún error, detener el envío del formulario
    if (idError || nombreError || nombreCompletoError) {
      return;
    }
    
    // Asegurarse de que todos los campos sean string
    const depto: Departamento = {
      id: parseInt(formData.id, 10),
      nombre: String(formData.nombre || ''),
      nombre_completo: String(formData.nombre_completo || '')
    };
    
    if (!deptoToEdit) {
      // Si es un nuevo departamento, se usa el ID del formulario
    } else {
      // Si se está editando, el ID original se usa para la actualización
      // y el objeto 'depto' contiene el ID potencialmente modificado.
    }
    onSave(depto);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deptoToEdit ? 'Editar Departamento' : 'Agregar Departamento'}
            </DialogTitle>
            <DialogDescription>
              Complete los campos requeridos para {deptoToEdit ? 'editar' : 'agregar'} el departamento.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="id">ID *</Label>
              <Input
                id="id"
                type="number"
                value={formData.id || ''}
                onChange={(e) => {
                  setFormData({ ...formData, id: e.target.value });
                  setFormErrors(prev => ({ ...prev, id: null }));
                }}
                placeholder="Ej: 101"
                className={formErrors.id ? 'border-red-500' : ''}
              />
              {formErrors.id && <div className="text-red-600 text-xs mt-1">{formErrors.id}</div>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre || ''}
                onChange={(e) => {
                  setFormData({ ...formData, nombre: e.target.value });
                  setFormErrors(prev => ({ ...prev, nombre: null }));
                }}
                placeholder="Ej: Ventas"
                className={formErrors.nombre ? 'border-red-500' : ''}
              />
              {formErrors.nombre && <div className="text-red-600 text-xs mt-1">{formErrors.nombre}</div>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre_completo">Nombre Completo *</Label>
              <Input
                id="nombre_completo"
                value={formData.nombre_completo || ''}
                onChange={(e) => {
                  setFormData({ ...formData, nombre_completo: e.target.value });
                  setFormErrors(prev => ({ ...prev, nombre_completo: null }));
                }}
                placeholder="Ej: Departamento de Ventas"
                className={formErrors.nombre_completo ? 'border-red-500' : ''}
              />
              {formErrors.nombre_completo && <div className="text-red-600 text-xs mt-1">{formErrors.nombre_completo}</div>}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                {deptoToEdit ? 'Guardar cambios' : 'Agregar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
