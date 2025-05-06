import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { CuentaContable, CentroCosto } from '../types';
import { useAppStore } from '../store';
import { Select, SelectContent, SelectItem, SelectTrigger } from "./ui/select";
import { Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface AddCuentaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cuenta: CuentaContable, centrosCosto: string[]) => void;
  centrosCosto: CentroCosto[];
  centrosCostoDefault: string[];
  cuentaToEdit?: CuentaContable | null;
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

export const AddCuentaDialog: React.FC<AddCuentaDialogProps> = (props) => {
  const { isOpen, onClose, onSave, cuentaToEdit, centrosCosto, centrosCostoDefault } = props;
  const { agregarCuenta, actualizarCuenta, cuentas } = useAppStore();
  const [formData, setFormData] = useState<{
    codigo: string;
    nombre: string;
    naturaleza: 'gasto' | 'ingreso'
  }>({
    codigo: '',
    nombre: '',
    naturaleza: 'gasto'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddTipoDialogOpen, setIsAddTipoDialogOpen] = useState(false);
  const [tiposCuenta, setTiposCuenta] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Obtener tipos únicos de cuentas existentes
  useEffect(() => {
    const tipos = new Set<string>();
    cuentas.forEach(cuenta => {
      if (cuenta.naturaleza) {
        tipos.add(cuenta.naturaleza);
      }
    });
    // Asegurarse de que al menos 'gasto' e 'ingreso' estén presentes
    tipos.add('gasto');
    tipos.add('ingreso');
    setTiposCuenta(tipos);
  }, [cuentas]);

  // Solo declarar y usar centrosSeleccionados si hay centrosCosto y centrosCostoDefault (modo editor de formatos)
  const [centrosSeleccionados, setCentrosSeleccionados] = (centrosCosto && centrosCostoDefault)
    ? useState<string[]>(centrosCostoDefault)
    : [undefined, undefined];

  useEffect(() => {
    if (cuentaToEdit) {
      setFormData({
        codigo: cuentaToEdit.codigo,
        nombre: cuentaToEdit.nombre,
        naturaleza: cuentaToEdit.naturaleza
      });
      if (centrosCosto && centrosCostoDefault && setCentrosSeleccionados) setCentrosSeleccionados(centrosCostoDefault);
    } else {
      setFormData({
        codigo: '',
        nombre: '',
        naturaleza: 'gasto'
      });
      if (centrosCosto && centrosCostoDefault && setCentrosSeleccionados) setCentrosSeleccionados(centrosCostoDefault);
    }
  }, [cuentaToEdit, centrosCosto, centrosCostoDefault]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!formData.codigo || !formData.nombre || !formData.naturaleza) {
        throw new Error('Todos los campos son requeridos');
      }

      // Validar código duplicado
      const codigoExistente = cuentas.some(cuenta => 
        cuenta.codigo.toLowerCase() === formData.codigo.toLowerCase() && 
        cuenta.id !== cuentaToEdit?.id
      );

      if (codigoExistente) {
        setError('Ya existe una cuenta con este código');
        return;
      }

      const cuenta: CuentaContable = {
        id: cuentaToEdit?.id || uuidv4(),
        codigo: formData.codigo,
        nombre: formData.nombre,
        naturaleza: formData.naturaleza
      };

      // Solo pasar centros seleccionados si existen (modo editor de formatos)
      if (centrosCosto && centrosCostoDefault && centrosSeleccionados) {
        onSave(cuenta, centrosSeleccionados as string[]);
      } else {
        onSave(cuenta, []);
      }
      onClose();
    } catch (error) {
      console.error('Error al guardar la cuenta:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTipo = (nuevoTipo: string) => {
    setTiposCuenta(new Set([...tiposCuenta, nuevoTipo.toLowerCase()]));
    setFormData(prev => ({ ...prev, naturaleza: nuevoTipo.toLowerCase() as 'gasto' | 'ingreso' }));
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          setFormData({
            codigo: '',
            nombre: '',
            naturaleza: 'gasto'
          });
          setError(null);
          onClose();
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{cuentaToEdit ? 'Editar Cuenta' : 'Nueva Cuenta'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="codigo" className="block text-sm font-medium mb-1">
                Código
              </label>
              <Input
                id="codigo"
                placeholder="Ingrese el código"
                value={formData.codigo}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, codigo: e.target.value }));
                  setError(null);
                }}
                className={error ? 'border-red-500' : ''}
                required
              />
              {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            </div>
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium mb-1">
                Nombre
              </label>
              <Input
                id="nombre"
                placeholder="Ingrese el nombre"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                required
              />
            </div>
            <div>
              <label htmlFor="naturaleza" className="block text-sm font-medium mb-1">
                Tipo
              </label>
              <div className="flex gap-2">
                <Select
                  value={formData.naturaleza}
                  onValueChange={(value: string) => setFormData(prev => ({ ...prev, naturaleza: value as 'gasto' | 'ingreso' }))}
                >
                  <SelectTrigger>
                    {formData.naturaleza.charAt(0).toUpperCase() + formData.naturaleza.slice(1)}
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(tiposCuenta).map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
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
            </div>
            {/* Solo mostrar selección de centros de costo si existen las props (modo editor de formatos) */}
            {centrosCosto && centrosCosto.length > 0 && centrosCostoDefault && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Centros de Costo
                </label>
                <div className="space-y-2">
                  {centrosCosto.map((centro) => (
                    <div key={centro.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={centro.id}
                        checked={centrosSeleccionados && Array.isArray(centrosSeleccionados) ? centrosSeleccionados.includes(centro.id) : false}
                        onCheckedChange={(checked) => {
                          if (!setCentrosSeleccionados || !centrosSeleccionados || !Array.isArray(centrosSeleccionados)) return;
                          if (checked) {
                            setCentrosSeleccionados([...centrosSeleccionados, centro.id]);
                          } else {
                            setCentrosSeleccionados(centrosSeleccionados.filter(id => id !== centro.id));
                          }
                        }}
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
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData({
                    codigo: '',
                    nombre: '',
                    naturaleza: 'gasto'
                  });
                  onClose();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
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