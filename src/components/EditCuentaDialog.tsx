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

  React.useEffect(() => {
    if (cuenta) {
      setFormData(cuenta);
    }
  }, [cuenta]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="Código"
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
              className="w-full"
            />
          </div>
          <div>
            <Input
              type="text"
              placeholder="Nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full"
            />
          </div>
          <div>
            <Select
              value={formData.naturaleza}
              onValueChange={(value: 'ingreso' | 'gasto') =>
                setFormData({ ...formData, naturaleza: value })
              }
            >
              <SelectTrigger>
                {formData.naturaleza === 'ingreso' ? 'gasto' : 'ingreso'}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ingreso">Ingreso</SelectItem>
                <SelectItem value="gasto">Gasto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 