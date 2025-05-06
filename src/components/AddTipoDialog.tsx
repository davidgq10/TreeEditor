/**
 * Componente: AddTipoDialog
 * 
 * Descripción:
 * Este componente implementa un diálogo modal para agregar nuevos tipos de cuentas.
 * Proporciona una interfaz simple para crear nuevos tipos que pueden ser utilizados
 * en la clasificación de cuentas contables.
 * 
 * Ubicación de renderizado:
 * - Es llamado desde componentes que manejan la gestión de tipos de cuentas
 * - Se utiliza principalmente en el contexto de configuración de cuentas contables
 * 
 * Funcionalidad:
 * 1. Muestra un formulario simple para ingresar el nombre del nuevo tipo
 * 2. Valida que el nombre no esté vacío
 * 3. Normaliza el nombre a minúsculas antes de guardar
 * 4. Proporciona opciones para guardar o cancelar la operación
 * 
 * Props:
 * - isOpen: boolean - Controla la visibilidad del diálogo
 * - onClose: () => void - Función para cerrar el diálogo
 * - onAdd: (tipo: string) => void - Función para agregar el nuevo tipo
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface AddTipoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (tipo: string) => void;
}

export const AddTipoDialog: React.FC<AddTipoDialogProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  // Estado para manejar el nombre del nuevo tipo
  const [nuevoTipo, setNuevoTipo] = useState('');

  // Función para manejar el envío del formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevoTipo.trim()) {
      onAdd(nuevoTipo.trim().toLowerCase());
      setNuevoTipo('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Tipo de Cuenta</DialogTitle>
        </DialogHeader>
        {/* Formulario para agregar nuevo tipo */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="tipo" className="block text-sm font-medium mb-1">
              Nombre del Tipo
            </label>
            <Input
              id="tipo"
              placeholder="Ingrese el nombre del tipo"
              value={nuevoTipo}
              onChange={(e) => setNuevoTipo(e.target.value)}
              required
            />
          </div>
          {/* Botones de acción */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Agregar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 