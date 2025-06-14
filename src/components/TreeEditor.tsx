import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { Button } from './ui/button';
import { TreeNode } from './TreeNode';
import { useAppStore } from '../store';
import { Plus, Download, Check, X, ChevronDown, ChevronRight, Upload } from 'lucide-react';
import { exportarAExcel, importFromExcel } from '../services/excel';
import { Label } from './ui/label';
import { Card } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "./ui/dialog";
import { Checkbox } from "./ui/checkbox";
import { AddCuentaDialog } from './AddCuentaDialog';
import { SelectCuentaDialog } from './SelectCuentaDialog';
import { Formato, Nodo, CuentaContable } from '../types';
import { Alert } from './ui/alert';

export const TreeEditor: React.FC = () => {
  const {
    formatos,
    formatoActual,
    agregarNodo,
    moverNodo,
    centrosCosto,
    agregarFormato
  } = useAppStore();

  const [centrosCostoDefault, setCentrosCostoDefault] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isAddCuentaDialogOpen, setIsAddCuentaDialogOpen] = useState(false);
  const [showCuentaSelector, setShowCuentaSelector] = useState(false);
  const [centrosCostoExpandido, setCentrosCostoExpandido] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [missingCuentas, setMissingCuentas] = useState<string[]>([]);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const formato = formatos.find(f => f.id === formatoActual);

  useEffect(() => {
    if (formato) {
      setCentrosCostoDefault(formato.centrosCostoDefault);
    }
  }, [formato?.id]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Función recursiva para encontrar el parentId y el índice de destino
  function findParentAndIndex(nodes: Nodo[], targetId: string, parentId: string | null = null): { parentId: string | null, index: number } | null {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === targetId) {
        return { parentId, index: i };
      }
      const res = findParentAndIndex(nodes[i].hijos, targetId, nodes[i].id);
      if (res) return res;
    }
    return null;
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    if (!formato) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Buscar el parentId y el índice de destino
    const destino = findParentAndIndex(formato.estructura, overId);
    if (!destino) return;

    moverNodo(activeId, destino.parentId, destino.index);
  };

  const handleCentroCostoChange = (centroId: string, checked: boolean) => {
    setCentrosCostoDefault(prev => {
      if (checked) {
        return [...prev, centroId];
      } else {
        return prev.filter(id => id !== centroId);
      }
    });
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const { formato } = await importFromExcel({
        file,
        centrosCostoList: centrosCosto
      });
      
      // Agregar el nuevo formato importado
      agregarFormato(formato);
      setShowImportModal(true);
    } catch (error) {
      console.error('Error al importar el archivo:', error);
      setImportError(error instanceof Error ? error.message : 'Error desconocido al importar el archivo');
      setShowImportModal(true);
    } finally {
      setIsImporting(false);
      // Limpiar el input para permitir volver a seleccionar el mismo archivo
      event.target.value = '';
    }
  };

  const handleAddCuenta = (cuentas: CuentaContable[]) => {
    cuentas.forEach(cuenta => {
      agregarNodo(null, 'cuenta', cuenta, centrosCostoDefault);
    });
  };

  // Función recursiva para recolectar cuentas sin centros de costo
  function getCuentasSinCentros(nodos: Nodo[]): string[] {
    let result: string[] = [];
    nodos.forEach(nodo => {
      if (nodo.tipo === 'cuenta' && (!nodo.centrosCosto || nodo.centrosCosto.length === 0)) {
        result.push(`${nodo.cuenta?.codigo || ''} ${nodo.cuenta?.nombre || nodo.nombre}`.trim());
      }
      if (nodo.hijos.length > 0) {
        result = result.concat(getCuentasSinCentros(nodo.hijos));
      }
    });
    return result;
  }

  if (!formato) {
    return (
      <div className="p-4 text-center text-gray-500">
        Selecciona un formato para comenzar a editar
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ maxWidth: "115%", margin: "0 auto" }}>
      {/* 1. Nombre del informe */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-2xl font-bold">{formato.nombre}</h2>
      </div>
      
      {/* 2. Opciones (botones de acción) */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => agregarNodo(null, 'grupo', undefined, centrosCostoDefault)}
            variant="outline"
            size="sm"
            className="bg-gray-50 hover:bg-gray-100 border-gray-300"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Grupo
          </Button>
          <Button
            onClick={() => setShowCuentaSelector(true)}
            variant="outline"
            size="sm"
            className="bg-gray-50 hover:bg-gray-100 border-gray-300"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Cuenta
          </Button>
          <Button
            onClick={() => agregarNodo(null, 'medida', undefined, centrosCostoDefault)}
            variant="outline"
            size="sm"
            className="bg-gray-50 hover:bg-gray-100 border-gray-300"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Medida
          </Button>
          <Button
            onClick={async () => {
              setExportError(null);
              setExportSuccess(null);
              if (!formato) return;
              const cuentasFaltantes = getCuentasSinCentros(formato.estructura);
              if (cuentasFaltantes.length > 0) {
                setMissingCuentas(cuentasFaltantes);
                setShowMissingModal(true);
                return;
              }
              try {
                const buffer = await exportarAExcel({ formato, datos: {}, centrosCostoList: centrosCosto });
                const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${formato.nombre}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                setExportSuccess('¡Validación completada exitosamente!');
                setShowExportModal(true);
              } catch (error) {
                setExportError('Ocurrió un error al exportar a Excel.');
                setShowExportModal(true);
              }
            }}
            variant="outline"
            size="sm"
            className="bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar Excel
          </Button>
        </div>
      </div>
      
      {/* 3. Centros de costo por defecto */}
      <Card className="p-4">
        <div className="space-y-2">
          <Label className="text-lg font-semibold">Centros de Costo por Defecto</Label>
          <div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {centrosCostoDefault.length > 0
                    ? `${centrosCostoDefault.length} centros seleccionados` : "Seleccionar centros de costo"}
                  <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Seleccionar Centros de Costo</DialogTitle>
                </DialogHeader>
                <div className="flex gap-2 mb-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCentrosCostoDefault(centrosCosto.filter(c => c.idNetsuite).map(c => c.idNetsuite as string))}
                  >
                    Seleccionar todo
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCentrosCostoDefault([])}
                  >
                    Quitar todo
                  </Button>
                </div>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-auto">
                  {centrosCosto.map((centro) => (
                    <div key={centro.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={centro.id}
                        checked={centro.idNetsuite ? centrosCostoDefault.includes(centro.idNetsuite) : false}
                        onCheckedChange={(checked) => centro.idNetsuite && handleCentroCostoChange(centro.idNetsuite, checked as boolean)}
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
                  <Button onClick={() => setDialogOpen(false)}>
                    Aceptar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="mt-2">
              <div className="mb-2 flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-6 w-6 mr-2"
                  onClick={() => setCentrosCostoExpandido((v) => !v)}
                  aria-label={centrosCostoExpandido ? 'Colapsar' : 'Expandir'}
                >
                  {centrosCostoExpandido ? <ChevronDown /> : <ChevronRight />}
                </Button>
                <span className="text-sm text-gray-600 align-middle">
                  {centrosCostoDefault.length} centros seleccionados
                </span>
                {!centrosCostoExpandido && (
                  <span
                    className="ml-2 text-xs text-gray-500 align-middle max-w-[350px] truncate inline-block align-bottom"
                    title={centrosCostoDefault.length > 0 ? centrosCostoDefault.map(id => {
                      const centro = centrosCosto.find(c => c.id === id);
                      return centro ? `${centro.nombre} (${centro.tipo})` : '';
                    }).filter(Boolean).join(', ') : ''}
                  >
                    {centrosCostoDefault.length > 0 &&
                      `(${centrosCostoDefault.map(id => {
                        const centro = centrosCosto.find(c => c.id === id);
                        return centro ? `${centro.nombre} (${centro.tipo})` : '';
                      }).filter(Boolean).join(', ')})`}
                  </span>
                )}
              </div>
              {centrosCostoExpandido && (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border rounded p-2 bg-gray-50">
                  {centrosCostoDefault.map((id) => {
                    const centro = centrosCosto.find((c) => c.idNetsuite === id);
                    if (!centro) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-xs font-medium"
                      >
                        {centro.nombre} ({centro.tipo})
                        <button
                          type="button"
                          className="ml-2 text-blue-800 hover:text-red-600 focus:outline-none"
                          onClick={() => setCentrosCostoDefault((prev) => prev.filter((cid) => cid !== id))}
                          aria-label="Eliminar centro de costo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="bg-white rounded-lg shadow p-4">

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={formato.estructura.map(node => node.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {formato.estructura.map((node) => (
                <TreeNode
                  key={node.id}
                  node={{
                    ...node,
                    // Asegurarse que centrosCosto sea siempre un array y contenga idNetsuite válidos
                    centrosCosto: (node.centrosCosto || [])
                      .filter(id => {
                        // Verificar si el id es un idNetsuite válido
                        return centrosCosto.some(c => c.idNetsuite === id);
                      })
                  }}
                  level={0}
                  centrosCostoDefault={centrosCostoDefault}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <SelectCuentaDialog
        isOpen={showCuentaSelector}
        onClose={() => setShowCuentaSelector(false)}
        onSelect={handleAddCuenta}
        cuentas={useAppStore.getState().cuentas}
        multiple={true}
      />

      {/* Modal de advertencia por cuentas sin centros de costo */}
      <Dialog open={showMissingModal} onOpenChange={setShowMissingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No se puede exportar</DialogTitle>
          </DialogHeader>
          <div className="mb-2 text-red-700 font-semibold">Las siguientes cuentas no tienen centros de costo asignados:</div>
          <ul className="mb-4 list-disc pl-6 text-sm text-red-700">
            {missingCuentas.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
          <div className="text-sm text-gray-600">Por favor, asigne al menos un centro de costo a cada cuenta antes de exportar.</div>
          <DialogFooter>
            <Button onClick={() => setShowMissingModal(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal de confirmación de exportación */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{exportError ? 'Error en la exportación' : 'Validación de datos exitosa'}</DialogTitle>
          </DialogHeader>
          <div className={exportError ? 'text-red-700' : 'text-green-700'}>
            {exportError || '¡Validación completada exitosamente!'}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowExportModal(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de importación */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{importError ? 'Error en la importación' : 'Importación exitosa'}</DialogTitle>
          </DialogHeader>
          <div className={importError ? 'text-red-700' : 'text-green-700'}>
            {importError || 'El formato se ha importado correctamente.'}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowImportModal(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 