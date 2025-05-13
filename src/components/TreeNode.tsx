import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, ChevronDown, GripVertical, Trash2, Plus, X, Folder } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useAppStore } from '../store';
import { Nodo, CuentaContable } from '../types/index';
import { SelectCuentaDialog } from './SelectCuentaDialog';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { Select, SelectContent, SelectItem, SelectTrigger } from './ui/select';
import { Label } from './ui/label';
import { CentroCostoSelector } from './CentroCostoSelector';
import { Switch } from './ui/switch';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';

interface TreeNodeProps {
  node: Nodo;
  level: number;
  centrosCostoDefault: string[];
}

// Paleta de colores suaves para niveles
const levelColors = [
  'bg-blue-50/50',
  'bg-purple-50/50',
  'bg-green-50/50',
  'bg-yellow-50/50',
  'bg-pink-50/50',
  'bg-indigo-50/50',
  'bg-teal-50/50',
];

// Paleta de bordes izquierdos por nivel con colores más suaves y profesionales
const levelBorderColors = [
  'border-l-[6px] border-blue-600',   // nivel 0 - azul
  'border-l-[6px] border-purple-500', // nivel 1 - morado
  'border-l-[6px] border-green-500',  // nivel 2 - verde
  'border-l-[6px] border-indigo-500', // nivel 3 - índigo
  'border-l-[6px] border-pink-500',   // nivel 4 - rosa
  'border-l-[6px] border-teal-500',   // nivel 5 - verde azulado
  'border-l-[6px] border-violet-500', // nivel 6 - violeta
];

export const TreeNode: React.FC<TreeNodeProps> = ({ node, level, centrosCostoDefault }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showCuentaDialog, setShowCuentaDialog] = useState(false);
  const [showCentroCostoDialog, setShowCentroCostoDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    showConfirmButton: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    showConfirmButton: true
  });
  const [centrosCostoExpandido, setCentrosCostoExpandido] = useState(false);

  const { actualizarNodo, eliminarNodo, agregarNodo, cuentas, centrosCosto } = useAppStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver
  } = useSortable({
    id: node.id,
    data: {
      type: 'node',
      node
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: `${level * 24}px`,
    opacity: isDragging ? 0.5 : 1
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    actualizarNodo(node.id, { nombre: event.target.value });
  };

  const toggleEdit = () => {
    setIsEditing(!isEditing);
  };

  const handleSelectCuenta = (cuentas: CuentaContable[]) => {
    cuentas.forEach(cuenta => {
      agregarNodo(node.id, 'cuenta', cuenta, centrosCostoDefault);
    });
    setShowCuentaDialog(false);
  };

  const handleDeleteNode = () => {
    setDeleteConfirmation({
      isOpen: true,
      title: 'Eliminar Nodo',
      message: `¿Estás seguro de eliminar ${node.tipo === 'grupo' ? 'el grupo' : 'la cuenta'} "${node.nombre}"? Esta acción no se puede deshacer.`,
      onConfirm: () => {
        eliminarNodo(node.id);
        setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
      },
      showConfirmButton: true
    });
  };

  const handleSave = () => {
    actualizarNodo(node.id, {
      nombre: node.nombre
    });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleAddChild = (tipo: 'grupo' | 'cuenta') => {
    agregarNodo(node.id, tipo, undefined, centrosCostoDefault);
  };

  const handleCentroCostoSave = (centrosCosto: string[]) => {
    actualizarNodo(node.id, { centrosCosto });
  };

  const handleInvertirValorChange = (checked: boolean) => {
    actualizarNodo(node.id, { invertirValor: checked });
  };

  const isDropTarget = isDragging && attributes['aria-describedby'] === 'droppable';

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 p-3 border-0 rounded-lg mb-2.5 transition-all duration-200
          ${levelBorderColors[level % levelBorderColors.length]}
          ${isDropTarget ? 'ring-2 ring-blue-500 scale-105' : ''}
          ${node.tipo === 'grupo' ? 'bg-gray-100 hover:bg-gray-200' : node.tipo === 'cuenta' ? 'bg-white hover:bg-gray-50' : ''}
          shadow-sm hover:shadow-md
          group
        `}
      >
        {/* Indicador visual de drop */}
        {isOver && !isDragging && (
          <div className="absolute left-0 right-0 top-0 h-2 flex items-center z-10">
            <div className="mx-2 h-2 rounded-full bg-black w-[calc(100%-16px)] opacity-80"></div>
          </div>
        )}
        {/* Ícono de grupo o cuenta */}
        {node.tipo === 'grupo' ? (
          <Folder className="w-5 h-5 text-blue-600 mr-1 group-hover:text-blue-700 transition-colors" />
        ) : (
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-300 text-black text-lg font-bold mr-1 border border-yellow-400 shadow-sm" style={{fontFamily: 'monospace'}}>¢</span>
        )}
        {/* Drag and drop handle en todos los niveles */}
        <div {...attributes} {...listeners}>
          <GripVertical className="w-4 h-4 text-gray-400 cursor-move hover:text-gray-600 transition-colors" />
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          {node.hijos.length > 0 ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600 group-hover:text-gray-800 transition-colors" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-800 transition-colors" />
            )
          ) : null}
        </button>

        {isEditing ? (
          <Input
            value={node.nombre}
            onChange={handleNameChange}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className="h-8 focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <div className="flex-1 cursor-pointer" onClick={toggleEdit}>
            <div className="font-medium group-hover:text-gray-800 transition-colors">{node.nombre}</div>
            {node.tipo === 'cuenta' && (!node.centrosCosto || node.centrosCosto.length === 0) && (
              <div className="mt-1 text-xs text-red-700 font-semibold">Seleccione los centros de costo</div>
            )}
            {node.tipo === 'cuenta' && (
              <div className="mt-1 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-6 w-6 hover:bg-gray-100"
                  onClick={e => { e.stopPropagation(); setCentrosCostoExpandido(v => !v); }}
                  aria-label={centrosCostoExpandido ? 'Colapsar' : 'Expandir'}
                >
                  {centrosCostoExpandido ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </Button>
                <span className="text-xs text-gray-600 group-hover:text-gray-700 transition-colors">
                  {node.centrosCosto && node.centrosCosto.length > 0
                    ? `${node.centrosCosto.length} centros seleccionados`
                    : '0 elementos seleccionados'}
                </span>
                {centrosCostoExpandido && node.centrosCosto && node.centrosCosto.length > 0 && (
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto border rounded p-2 bg-gray-50/50 mt-1">
                    {node.centrosCosto.map(id => {
                      const centro = centrosCosto.find(c => c.id === id);
                      if (!centro) return null;
                      return (
                        <span key={id} className="inline-flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-xs font-medium hover:bg-blue-200 transition-colors">
                          {centro.nombre} ({centro.tipo})
                          <button
                            type="button"
                            className="ml-2 text-blue-800 hover:text-red-600 focus:outline-none"
                            onClick={e => {
                              e.stopPropagation();
                              const nuevos = node.centrosCosto.filter(cid => cid !== id);
                              actualizarNodo(node.id, { centrosCosto: nuevos });
                            }}
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
            )}
          </div>
        )}

        <div className="flex items-center gap-1">
          {node.tipo === 'cuenta' && (
            <div className="flex items-center space-x-2 mr-2">
              <Label htmlFor={`invertir-${node.id}`} className="text-xs text-gray-600 whitespace-nowrap">
                Invertir valor
              </Label>
              <Switch
                id={`invertir-${node.id}`}
                checked={node.invertirValor || false}
                onCheckedChange={handleInvertirValorChange}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
          )}
          {node.tipo === 'grupo' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAddChild('grupo')}
                className="hover:bg-gray-100"
              >
                <Plus className="w-4 h-4 mr-1" />
                Grupo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCuentaDialog(true)}
                className="hover:bg-gray-100"
              >
                <Plus className="w-4 h-4 mr-1" />
                Cuenta
              </Button>
            </>
          )}
          {node.tipo === 'cuenta' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCentroCostoDialog(true)}
                className="hover:bg-gray-100"
              >
                <Plus className="w-4 h-4 mr-1" />
                Centros
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteNode}
            className="hover:bg-red-50 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isExpanded && node.hijos.length > 0 && (
        <SortableContext
          items={node.hijos.map(h => h.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2.5">
            {node.hijos.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                level={level + 1}
                centrosCostoDefault={centrosCostoDefault}
              />
            ))}
          </div>
        </SortableContext>
      )}

      <SelectCuentaDialog
        isOpen={showCuentaDialog}
        onClose={() => setShowCuentaDialog(false)}
        onSelect={handleSelectCuenta}
        cuentas={cuentas}
        multiple={true}
      />

      <CentroCostoSelector
        isOpen={showCentroCostoDialog}
        onClose={() => setShowCentroCostoDialog(false)}
        onSave={handleCentroCostoSave}
        centrosCosto={centrosCosto}
        centrosCostoDefault={(node as any).centrosCosto || centrosCostoDefault}
      />

      <DeleteConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
        onConfirm={deleteConfirmation.onConfirm}
        title={deleteConfirmation.title}
        message={deleteConfirmation.message}
        showConfirmButton={deleteConfirmation.showConfirmButton}
      />
    </>
  );
}; 