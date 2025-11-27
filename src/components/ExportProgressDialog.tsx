import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Progress } from "../components/ui/progress";
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export interface ExportProgress {
  status: 'preparing' | 'processing' | 'finalizing' | 'complete' | 'error';
  currentRow: number;
  totalRows: number;
  currentPhase: string;
  errorMessage?: string;
  estimatedTimeRemaining?: string;
}

interface ExportProgressDialogProps {
  isOpen: boolean;
  progress: ExportProgress;
  onClose?: () => void;
}

export const ExportProgressDialog: React.FC<ExportProgressDialogProps> = ({
  isOpen,
  progress,
  onClose
}) => {
  const progressPercentage = progress.totalRows > 0
    ? Math.min(Math.round((progress.currentRow / progress.totalRows) * 100), 100)
    : 0;

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'preparing':
      case 'processing':
      case 'finalizing':
        return <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />;
      case 'complete':
        return <CheckCircle2 className="w-8 h-8 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-600" />;
    }
  };

  const getStatusMessage = () => {
    switch (progress.status) {
      case 'preparing':
        return 'Preparando exportación...';
      case 'processing':
        return 'Procesando datos...';
      case 'finalizing':
        return 'Finalizando archivo Excel...';
      case 'complete':
        return '¡Exportación completada exitosamente!';
      case 'error':
        return 'Error en la exportación';
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'preparing':
      case 'processing':
      case 'finalizing':
        return 'text-blue-700';
      case 'complete':
        return 'text-green-700';
      case 'error':
        return 'text-red-700';
    }
  };

  const canClose = progress.status === 'complete' || progress.status === 'error';

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={canClose ? onClose : undefined}
    >
      <DialogContent 
        className="sm:max-w-[500px]"
        onPointerDownOutside={(e) => !canClose && e.preventDefault()}
        onEscapeKeyDown={(e) => !canClose && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Exportación de Formato a Excel</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Icono de estado */}
          <div className="flex justify-center">
            {getStatusIcon()}
          </div>

          {/* Mensaje de estado */}
          <div className={`text-center font-semibold text-lg ${getStatusColor()}`}>
            {getStatusMessage()}
          </div>

          {/* Fase actual */}
          {progress.currentPhase && (
            <div className="text-center text-sm text-gray-600">
              {progress.currentPhase}
            </div>
          )}

          {/* Barra de progreso */}
          {progress.status === 'processing' && progress.totalRows > 0 && (
            <div className="space-y-2">
              <Progress value={progressPercentage} className="h-3" />
              <div className="flex justify-between text-sm text-gray-600">
                <span>
                  {progress.currentRow.toLocaleString()} / {progress.totalRows.toLocaleString()} filas
                </span>
                <span>{progressPercentage}%</span>
              </div>
            </div>
          )}

          {/* Tiempo estimado */}
          {progress.estimatedTimeRemaining && progress.status === 'processing' && (
            <div className="text-center text-sm text-gray-500">
              Tiempo estimado restante: {progress.estimatedTimeRemaining}
            </div>
          )}

          {/* Mensaje de error */}
          {progress.status === 'error' && progress.errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{progress.errorMessage}</p>
            </div>
          )}

          {/* Mensaje de éxito con detalles */}
          {progress.status === 'complete' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">
                Se han exportado {progress.totalRows.toLocaleString()} filas correctamente.
              </p>
            </div>
          )}

          {/* Advertencia de no cerrar */}
          {!canClose && (
            <div className="text-center text-xs text-gray-500 italic">
              Por favor, no cierre esta ventana durante la exportación
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
