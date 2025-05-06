/**
 * Componente: SelectCuentaDialog
 * 
 * Descripción:
 * Este componente implementa un diálogo modal para seleccionar una cuenta contable
 * de una lista. Incluye funcionalidad de búsqueda y muestra los detalles relevantes
 * de cada cuenta en formato de tabla.
 * 
 * Ubicación de renderizado:
 * - Es llamado desde componentes que requieren selección de cuentas contables
 * - Se utiliza principalmente en la configuración de reportes y asignaciones
 * 
 * Funcionalidad:
 * 1. Muestra una lista de cuentas contables en formato de tabla
 * 2. Permite buscar cuentas por código o nombre
 * 3. Filtra las cuentas en tiempo real según el término de búsqueda
 * 4. Permite seleccionar una cuenta y cerrar el diálogo
 * 
 * Props:
 * - isOpen: boolean - Controla la visibilidad del diálogo
 * - onClose: () => void - Función para cerrar el diálogo
 * - onSelect: (cuentas: CuentaContable[]) => void - Función para seleccionar una cuenta
 * - cuentas: CuentaContable[] - Lista de cuentas contables disponibles
 * - multiple?: boolean - Indica si se permite selección múltiple de cuentas
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search } from 'lucide-react';
import { CuentaContable } from '../types';

interface SelectCuentaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (cuentas: CuentaContable[]) => void;
  cuentas: CuentaContable[];
  multiple?: boolean;
}

export const SelectCuentaDialog: React.FC<SelectCuentaDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
  cuentas,
  multiple = false
}) => {
  // Estado para manejar el término de búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  // Estado para rastrear las cuentas seleccionadas
  const [selectedCuentas, setSelectedCuentas] = useState<CuentaContable[]>([]);

  // Resetear las cuentas seleccionadas cuando se cierra el diálogo
  useEffect(() => {
    if (!isOpen) {
      setSelectedCuentas([]);
    }
  }, [isOpen]);

  // Filtrado de cuentas basado en el término de búsqueda
  const filteredCuentas = cuentas.filter(cuenta =>
    cuenta.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cuenta.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (cuenta: CuentaContable) => {
    if (multiple) {
      setSelectedCuentas(prev => {
        const exists = prev.some(c => c.id === cuenta.id);
        if (exists) {
          return prev.filter(c => c.id !== cuenta.id);
        } else {
          return [...prev, cuenta];
        }
      });
    } else {
      onSelect([cuenta]);
      onClose();
    }
  };

  const handleConfirm = () => {
    if (selectedCuentas.length > 0) {
      onSelect(selectedCuentas);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Seleccionar Cuentas</DialogTitle>
        </DialogHeader>
        
        {/* Campo de búsqueda con ícono */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar por código o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabla de cuentas con scroll */}
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Código</th>
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Naturaleza</th>
                <th className="px-4 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredCuentas.map((cuenta) => (
                <tr 
                  key={cuenta.id} 
                  className={`border-t hover:bg-gray-50 ${selectedCuentas.some(c => c.id === cuenta.id) ? 'bg-green-50' : ''}`}
                >
                  <td className="px-4 py-2">{cuenta.codigo}</td>
                  <td className="px-4 py-2">{cuenta.nombre}</td>
                  <td className="px-4 py-2 capitalize">{cuenta.naturaleza}</td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant={selectedCuentas.some(c => c.id === cuenta.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSelect(cuenta)}
                    >
                      {selectedCuentas.some(c => c.id === cuenta.id) ? 'Seleccionado' : 'Seleccionar'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-500">
            {selectedCuentas.length > 0 && `${selectedCuentas.length} cuenta(s) seleccionada(s)`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            {multiple && (
              <Button 
                onClick={handleConfirm}
                disabled={selectedCuentas.length === 0}
              >
                Confirmar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 