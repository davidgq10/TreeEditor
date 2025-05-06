/**
 * Componente: DeleteConfirmationDialog
 * 
 * Descripción:
 * Este componente implementa un diálogo modal de confirmación para operaciones de eliminación.
 * Proporciona una interfaz consistente para confirmar acciones destructivas en toda la aplicación.
 * 
 * Ubicación de renderizado:
 * - Es llamado desde diferentes componentes que requieren confirmación antes de eliminar datos
 * - Se utiliza principalmente en CentroCostoManager y otros gestores de datos
 * 
 * Funcionalidad:
 * 1. Muestra un diálogo de confirmación con título y mensaje personalizados
 * 2. Incluye un ícono de advertencia para indicar la naturaleza destructiva de la acción
 * 3. Proporciona botones para confirmar o cancelar la operación
 * 4. Mantiene una interfaz consistente para todas las confirmaciones de eliminación
 * 
 * Props:
 * - isOpen: boolean - Controla la visibilidad del diálogo
 * - onClose: () => void - Función para cerrar el diálogo
 * - onConfirm: () => void - Función para confirmar la eliminación
 * - title: string - Título del diálogo
 * - message: ReactNode - Mensaje descriptivo de la acción a confirmar
 * - showConfirmButton: boolean - Indica si se debe mostrar el botón de confirmación
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  showConfirmButton?: boolean;
}

export const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  showConfirmButton = true
}) => {
  const handleConfirm = () => {
    if (showConfirmButton) {
      onConfirm();
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {/* Ícono de advertencia para indicar acción destructiva */}
            <AlertTriangle className="h-5 w-5 text-red-500" />
            {title}
          </DialogTitle>
        </DialogHeader>
        {/* Mensaje descriptivo de la acción */}
        <div className="py-4">
          {typeof message === 'string' ? (
            <p className="text-sm text-gray-600">{message}</p>
          ) : (
            message
          )}
        </div>
        {/* Botones de acción */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {showConfirmButton && (
            <Button variant="destructive" onClick={handleConfirm}>
              Confirmar Eliminación
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 