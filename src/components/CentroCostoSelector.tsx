/**
 * Componente: CentroCostoSelector
 * 
 * Descripción:
 * Este componente implementa un diálogo modal que permite seleccionar múltiples centros de costo
 * mediante checkboxes. Es utilizado para filtrar o asignar centros de costo en diferentes contextos
 * de la aplicación.
 * 
 * Ubicación de renderizado:
 * - Es llamado desde diferentes componentes que requieren selección múltiple de centros de costo
 * - Se utiliza principalmente en filtros y configuraciones de reportes
 * 
 * Funcionalidad:
 * 1. Muestra una lista de centros de costo con checkboxes
 * 2. Permite seleccionar/deseleccionar centros de costo
 * 3. Mantiene el estado de las selecciones
 * 4. Permite guardar las selecciones realizadas
 * 
 * Props:
 * - isOpen: boolean - Controla la visibilidad del diálogo
 * - onClose: () => void - Función para cerrar el diálogo
 * - onSave: (centrosCosto: string[]) => void - Función para guardar las selecciones
 * - centrosCosto: CentroCosto[] - Lista de todos los centros de costo disponibles
 * - centrosCostoDefault: string[] - Lista de IDs de centros de costo seleccionados por defecto
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { CentroCosto } from '../types';
import { Input } from './ui/input';

interface CentroCostoSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (centrosCosto: string[]) => void;
  centrosCosto: CentroCosto[];
  centrosCostoDefault: string[];
}

export const CentroCostoSelector: React.FC<CentroCostoSelectorProps> = ({
  isOpen,
  onClose,
  onSave,
  centrosCosto,
  centrosCostoDefault
}) => {
  const [centrosSeleccionados, setCentrosSeleccionados] = useState<string[]>(centrosCostoDefault);
  const [searchTerm, setSearchTerm] = useState('');

  // Efecto para actualizar las selecciones cuando cambian los valores por defecto
  React.useEffect(() => {
    setCentrosSeleccionados(centrosCostoDefault);
  }, [centrosCostoDefault]);

  // Función para manejar cambios en la selección de centros de costo
  const handleCentroCostoChange = (id: string, checked: boolean) => {
    if (checked) {
      setCentrosSeleccionados(prev => [...prev, id]);
    } else {
      setCentrosSeleccionados(prev => prev.filter(cid => cid !== id));
    }
  };

  // Función para guardar las selecciones y cerrar el diálogo
  const handleSave = () => {
    onSave(centrosSeleccionados);
    onClose();
  };

  const filteredCentros = centrosCosto.filter(centro =>
    centro.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    centro.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Seleccionar Centros de Costo</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-auto">
          <div className="flex gap-2 mb-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setCentrosSeleccionados(centrosCosto.map(c => c.id))}
            >
              Seleccionar todo
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setCentrosSeleccionados([])}
            >
              Quitar todo
            </Button>
          </div>

          {/* Campo de búsqueda */}
          <div className="relative">
            <Input
              placeholder="Buscar centro de costo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          {filteredCentros.map((centro) => (
            <div key={centro.id} className="flex items-center space-x-2">
              <Checkbox
                id={centro.id}
                checked={centrosSeleccionados.includes(centro.id)}
                onCheckedChange={(checked) => handleCentroCostoChange(centro.id, checked as boolean)}
              />
              <label
                htmlFor={centro.id}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {`${centro.nombre} (${centro.tipo})`}
              </label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 