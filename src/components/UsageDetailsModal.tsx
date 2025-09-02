import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from './ui/button';
import { AlertTriangle } from 'lucide-react';

interface UsageDetails {
  type: 'cuenta' | 'centro' | 'departamento';
  itemName: string;
  usedInFormats: string[];
  count: number;
}

interface UsageDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  usageDetails: UsageDetails | null;
}

const UsageDetailsModal: React.FC<UsageDetailsModalProps> = ({
  isOpen,
  onClose,
  usageDetails
}) => {
  if (!usageDetails) return null;

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'cuenta': return 'cuenta contable';
      case 'centro': return 'centro de costo';
      case 'departamento': return 'departamento';
      default: return 'elemento';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            No se puede eliminar
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              La {getTypeLabel(usageDetails.type)} <strong>"{usageDetails.itemName}"</strong> no se puede eliminar 
              porque está siendo utilizada en <strong>{usageDetails.count}</strong> informe{usageDetails.count > 1 ? 's' : ''}.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2">Informes que utilizan este elemento:</h4>
            <div className="bg-gray-50 border rounded-lg p-3 max-h-32 overflow-y-auto">
              <ul className="space-y-1">
                {usageDetails.usedInFormats.map((formatName, index) => (
                  <li key={index} className="text-sm text-gray-700">
                    • {formatName}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Sugerencia:</strong> Para eliminar este elemento, primero debe removerlo de todos los informes listados arriba 
              o eliminar dichos informes.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UsageDetailsModal;
