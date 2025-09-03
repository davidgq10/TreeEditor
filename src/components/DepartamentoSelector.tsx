/**
 * Componente: DepartamentoSelector
 * 
 * Descripción:
 * Este componente implementa un diálogo modal que permite seleccionar múltiples departamentos
 * mediante checkboxes. Es utilizado para filtrar o asignar departamentos en diferentes contextos
 * de la aplicación.
 * 
 * Ubicación de renderizado:
 * - Es llamado desde diferentes componentes que requieren selección múltiple de departamentos
 * - Se utiliza principalmente en filtros y configuraciones de reportes
 * 
 * Funcionalidad:
 * 1. Muestra una lista de departamentos con checkboxes
 * 2. Permite seleccionar/deseleccionar departamentos
 * 3. Mantiene el estado de las selecciones
 * 4. Permite guardar las selecciones realizadas
 * 
 * Props:
 * - isOpen: boolean - Controla la visibilidad del diálogo
 * - onClose: () => void - Función para cerrar el diálogo
 * - onSave: (departamentos: string[]) => void - Función para guardar las selecciones
 * - departamentos: Departamento[] - Lista de todos los departamentos disponibles
 * - departamentosDefault: string[] - Lista de IDs de departamentos seleccionados por defecto
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Departamento } from '../types';
import { Input } from './ui/input';

interface DepartamentoSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (departamentos: string[]) => void;
  departamentos: Departamento[];
  departamentosDefault: string[];
}

export const DepartamentoSelector: React.FC<DepartamentoSelectorProps> = ({
  isOpen,
  onClose,
  onSave,
  departamentos,
  departamentosDefault
}) => {
  const [departamentosSeleccionados, setDepartamentosSeleccionados] = useState<number[]>(departamentosDefault.map(Number));
  const [searchTerm, setSearchTerm] = useState('');

  // Efecto para actualizar las selecciones cuando cambian los valores por defecto
  React.useEffect(() => {
    setDepartamentosSeleccionados(departamentosDefault.map(Number));
  }, [departamentosDefault]);

  // Función para manejar cambios en la selección de departamentos
  const handleDepartamentoChange = (id: number, checked: boolean) => {
    if (checked) {
      setDepartamentosSeleccionados(prev => [...prev, id]);
    } else {
      setDepartamentosSeleccionados(prev => prev.filter(did => did !== id));
    }
  };

  // Función para guardar las selecciones y cerrar el diálogo
  const handleSave = () => {
    onSave(departamentosSeleccionados.map(String));
    onClose();
  };

  const filteredDepartamentos = departamentos.filter(depto =>
    (depto.nombre && depto.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (depto.nombre_completo && depto.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (depto.tipo && depto.tipo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Obtener tipos únicos de los departamentos filtrados
  const tiposUnicos = Array.from(new Set(filteredDepartamentos.map(depto => depto.tipo).filter(Boolean))).sort();

  // Función para seleccionar todos los departamentos de un tipo específico
  const handleSelectByType = (tipo: string) => {
    const departamentosDelTipo = filteredDepartamentos
      .filter(depto => depto.tipo === tipo)
      .map(depto => depto.id);
    
    setDepartamentosSeleccionados(prev => {
      const nuevosSeleccionados = new Set([...prev, ...departamentosDelTipo]);
      return Array.from(nuevosSeleccionados);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Seleccionar Departamentos</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-auto">
          <div className="flex flex-wrap gap-2 mb-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDepartamentosSeleccionados(filteredDepartamentos.map(d => d.id))}
            >
              Seleccionar todo
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDepartamentosSeleccionados([])}
            >
              Quitar todo
            </Button>
          </div>
          
          {/* Botones para seleccionar por tipo */}
          {tiposUnicos.length > 1 && (
            <div className="mb-2">
              <div className="text-xs text-gray-600 mb-1">Seleccionar por tipo:</div>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {tiposUnicos.map(tipo => (
                  <Button
                    key={tipo}
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="text-xs px-2 py-1 h-6 flex-shrink-0 whitespace-nowrap"
                    onClick={() => handleSelectByType(tipo)}
                  >
                    {tipo}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Campo de búsqueda */}
          <div className="relative">
            <Input
              placeholder="Buscar departamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          {filteredDepartamentos.map((depto) => (
            <div key={depto.id} className="flex items-center space-x-2">
              <Checkbox
                id={String(depto.id)}
                checked={departamentosSeleccionados.includes(depto.id)}
                onCheckedChange={(checked) => handleDepartamentoChange(depto.id, checked as boolean)}
              />
              <label
                htmlFor={String(depto.id)}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {`${depto.nombre} (${depto.nombre_completo})`}
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
