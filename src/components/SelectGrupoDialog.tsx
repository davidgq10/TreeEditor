import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Search, Users, Calendar, Check } from 'lucide-react';
import { GrupoCuentas, CuentaContable } from '../types';

interface SelectGrupoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (grupos: GrupoCuentas[]) => void;
  grupos: GrupoCuentas[];
  cuentas: CuentaContable[];
}

export const SelectGrupoDialog: React.FC<SelectGrupoDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
  grupos,
  cuentas
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrupos, setSelectedGrupos] = useState<GrupoCuentas[]>([]);

  const filteredGrupos = grupos.filter(grupo =>
    grupo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (grupo.descripcion && grupo.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getCuentasNames = (cuentaIds: string[]): string[] => {
    return cuentaIds
      .map(id => cuentas.find(c => c.id === id))
      .filter((cuenta): cuenta is CuentaContable => cuenta !== undefined)
      .map(cuenta => `${cuenta.codigo} - ${cuenta.nombre}`);
  };

  const handleSelect = () => {
    if (selectedGrupos.length > 0) {
      onSelect(selectedGrupos);
      onClose();
      setSelectedGrupos([]);
      setSearchTerm('');
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedGrupos([]);
    setSearchTerm('');
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Seleccionar Grupos de Cuentas</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col flex-1 overflow-hidden space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar grupos por nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-gray-500">
              {filteredGrupos.length} de {grupos.length} grupos
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredGrupos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 text-center">
                  {searchTerm 
                    ? 'No se encontraron grupos que coincidan con la búsqueda' 
                    : 'No hay grupos de cuentas disponibles'}
                </p>
                {!searchTerm && (
                  <p className="text-sm text-gray-400 mt-2">
                    Crea grupos de cuentas desde el administrador de grupos
                  </p>
                )}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredGrupos.map((grupo) => {
                  const isSelected = selectedGrupos.some(g => g.id === grupo.id);
                  return (
                  <Card 
                    key={grupo.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedGrupos(selectedGrupos.filter(g => g.id !== grupo.id));
                      } else {
                        setSelectedGrupos([...selectedGrupos, grupo]);
                      }
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center">
                            {grupo.nombre}
                            {selectedGrupos.some(g => g.id === grupo.id) && (
                              <Check className="h-4 w-4 ml-2 text-blue-600" />
                            )}
                          </CardTitle>
                          {grupo.descripcion && (
                            <CardDescription className="mt-1">
                              {grupo.descripcion}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="h-4 w-4 mr-2" />
                          {grupo.cuentas.length} cuenta{grupo.cuentas.length !== 1 ? 's' : ''}
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          Creado: {formatDate(grupo.fechaCreacion)}
                        </div>

                        {grupo.cuentas.length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-gray-500 mb-2">Cuentas incluidas:</p>
                            <div className="space-y-1 max-h-20 overflow-y-auto">
                              {getCuentasNames(grupo.cuentas.slice(0, 3)).map((nombre, index) => (
                                <p key={index} className="text-xs text-gray-700 truncate">
                                  {nombre}
                                </p>
                              ))}
                              {grupo.cuentas.length > 3 && (
                                <p className="text-xs text-gray-500">
                                  +{grupo.cuentas.length - 3} más...
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSelect} 
            disabled={selectedGrupos.length === 0}
          >
            Agregar {selectedGrupos.length} Grupo{selectedGrupos.length !== 1 ? 's' : ''} ({selectedGrupos.reduce((total, grupo) => total + grupo.cuentas.length, 0)} cuentas)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
