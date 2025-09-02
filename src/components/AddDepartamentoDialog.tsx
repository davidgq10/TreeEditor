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
import { Select, SelectContent, SelectItem, SelectTrigger } from './ui/select';
import { Plus } from 'lucide-react';
import { Departamento } from '../types';
import { useAppStore } from '../store';

interface AddDepartamentoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  deptoToEdit: Departamento | null;
  onSave: (depto: Departamento) => void;
}

interface AddTipoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (nuevoTipo: string) => void;
}

const AddTipoDialog: React.FC<AddTipoDialogProps> = ({ isOpen, onClose, onAdd }) => {
  const [nuevoTipo, setNuevoTipo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevoTipo.trim()) {
      onAdd(nuevoTipo.trim());
      setNuevoTipo('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Tipo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nuevoTipo" className="block text-sm font-medium mb-1">
              Nombre del Tipo
            </label>
            <Input
              id="nuevoTipo"
              placeholder="Ingrese el nombre del nuevo tipo"
              value={nuevoTipo}
              onChange={(e) => setNuevoTipo(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              Agregar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

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
    nombre_completo: '',
    tipo: ''
  });
  const [formErrors, setFormErrors] = useState<{
    id: string | null;
    nombre: string | null;
    nombre_completo: string | null;
    tipo: string | null;
  }>({ 
    id: null,
    nombre: null,
    nombre_completo: null,
    tipo: null
   });
  const [tiposDepto, setTiposDepto] = useState<Set<string>>(new Set());
  const [isAddTipoDialogOpen, setIsAddTipoDialogOpen] = useState(false);

  // Actualizar tipos de departamentos disponibles
  useEffect(() => {
    const tipos = new Set<string>();
    departamentos.forEach(depto => {
      if (depto.tipo) {
        tipos.add(depto.tipo);
      }
    });
    setTiposDepto(tipos);
  }, [departamentos]);

  // Efecto para inicializar el formulario cuando se edita un depto existente
  useEffect(() => {
    if (deptoToEdit) {
      setFormData({
        id: String(deptoToEdit.id),
        nombre: deptoToEdit.nombre,
        nombre_completo: deptoToEdit.nombre_completo,
        tipo: deptoToEdit.tipo
      });
    } else {
      setFormData({
        id: '',
        nombre: '',
        nombre_completo: '',
        tipo: ''
      });
    }
    // Limpiar todos los errores
    setFormErrors({
      id: null,
      nombre: null,
      nombre_completo: null,
      tipo: null
    });
    setIsAddTipoDialogOpen(false);
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

  const validateTipo = (tipo: string | undefined) => {
    if (!tipo || !tipo.trim()) return 'El campo Tipo es obligatorio';
    return null;
  };

  // Función para manejar el envío del formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar todos los campos obligatorios
    const idError = validateId(formData.id);
    const nombreError = validateNombre(formData.nombre);
    const nombreCompletoError = validateNombreCompleto(formData.nombre_completo);
    const tipoError = validateTipo(formData.tipo);
    
    // Establecer errores de validación
    setFormErrors({
      id: idError,
      nombre: nombreError,
      nombre_completo: nombreCompletoError,
      tipo: tipoError
    });
    
    // Si hay algún error, detener el envío del formulario
    if (idError || nombreError || nombreCompletoError || tipoError) {
      return;
    }
    
    // Asegurarse de que todos los campos sean string
    const depto: Departamento = {
      id: parseInt(formData.id, 10),
      nombre: String(formData.nombre || ''),
      nombre_completo: String(formData.nombre_completo || ''),
      tipo: String(formData.tipo || '')
    };
    
    onSave(depto);
    onClose();
  };

  const handleAddTipo = (nuevoTipo: string) => {
    setTiposDepto(new Set([...tiposDepto, nuevoTipo]));
    setFormData(prev => ({ ...prev, tipo: nuevoTipo }));
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
                  <SelectTrigger className={`flex-1 ${formErrors.tipo ? 'border-red-500' : ''}`}>
                    <span className="text-left">
                      {formData.tipo || 'Seleccionar tipo'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(tiposDepto).sort().map((tipo) => (
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
                {deptoToEdit ? 'Guardar cambios' : 'Agregar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AddTipoDialog
        isOpen={isAddTipoDialogOpen}
        onClose={() => setIsAddTipoDialogOpen(false)}
        onAdd={handleAddTipo}
      />
    </>
  );
};
