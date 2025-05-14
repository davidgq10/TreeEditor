import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem } from './ui/select';
import { CuentaContable } from '../types';

interface EditCuentaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, cuenta: CuentaContable) => void;
  cuenta: CuentaContable | null;
}

export const EditCuentaDialog: React.FC<EditCuentaDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  cuenta
}) => {
  const [formData, setFormData] = React.useState<Partial<CuentaContable>>({
    codigo: '',
    nombre: '',
    naturaleza: 'gasto'
  });

  const [formErrors, setFormErrors] = React.useState<{
    codigo: string | null;
    nombre: string | null;
    naturaleza: string | null;
  }>({
    codigo: null,
    nombre: null,
    naturaleza: null
  });

  React.useEffect(() => {
    if (cuenta) {
      setFormData(cuenta);
      // Limpiar errores cuando se carga una cuenta
      setFormErrors({
        codigo: null,
        nombre: null,
        naturaleza: null
      });
    }
  }, [cuenta]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos obligatorios
    const newErrors = {
      codigo: !formData.codigo ? 'Este campo es obligatorio' : null,
      nombre: !formData.nombre ? 'Este campo es obligatorio' : null,
      naturaleza: !formData.naturaleza ? 'Este campo es obligatorio' : null
    };
    
    setFormErrors(newErrors);
    
    // Verificar si hay algún error
    if (newErrors.codigo || newErrors.nombre || newErrors.naturaleza) {
      return;
    }
    
    if (cuenta && formData.codigo && formData.nombre && formData.naturaleza) {
      onSave(cuenta.id, {
        ...cuenta,
        codigo: formData.codigo,
        nombre: formData.nombre,
        naturaleza: formData.naturaleza as 'ingreso' | 'gasto'
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Cuenta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium mb-1">Código</label>
            <Input
              type="text"
              placeholder="Código"
              value={formData.codigo}
              onChange={(e) => {
                setFormData({ ...formData, codigo: e.target.value });
                setFormErrors({ ...formErrors, codigo: null });
              }}
              className={`w-full ${formErrors.codigo ? 'border-red-500' : ''}`}
            />
            {formErrors.codigo && (
              <p className="mt-1 text-sm text-red-500">{formErrors.codigo}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <Input
              type="text"
              placeholder="Nombre"
              value={formData.nombre}
              onChange={(e) => {
                setFormData({ ...formData, nombre: e.target.value });
                setFormErrors({ ...formErrors, nombre: null });
              }}
              className={`w-full ${formErrors.nombre ? 'border-red-500' : ''}`}
            />
            {formErrors.nombre && (
              <p className="mt-1 text-sm text-red-500">{formErrors.nombre}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <Select
              value={formData.naturaleza}
              onValueChange={(value: 'ingreso' | 'gasto') => {
                setFormData({ ...formData, naturaleza: value });
                setFormErrors({ ...formErrors, naturaleza: null });
              }}
            >
              <SelectTrigger className={formErrors.naturaleza ? 'border-red-500' : ''}>
                {formData.naturaleza === 'ingreso' ? 'Ingreso' : 'Gasto'}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ingreso">Ingreso</SelectItem>
                <SelectItem value="gasto">Gasto</SelectItem>
              </SelectContent>
            </Select>
            {formErrors.naturaleza && (
              <p className="mt-1 text-sm text-red-500">{formErrors.naturaleza}</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 