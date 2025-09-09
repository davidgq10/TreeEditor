import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, ChevronDown, GripVertical, Trash2, Plus, X, Folder, Calculator } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useAppStore } from '../store';
import { Nodo, CuentaContable, Departamento, GrupoCuentas } from '../types/index';
import { SelectCuentaDialog } from './SelectCuentaDialog';
import { SelectGrupoDialog } from './SelectGrupoDialog';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { Select, SelectContent, SelectItem, SelectTrigger } from './ui/select';
import { Label } from './ui/label';
import { CentroCostoSelector } from './CentroCostoSelector';
import { DepartamentoSelector } from './DepartamentoSelector';
import { Switch } from './ui/switch';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';

interface TreeNodeProps {
  node: Nodo;
  level: number;
  centrosCostoDefault: string[];
  departamentosDefault: string[];
  forceExpanded?: boolean;
  highlightedNodeId?: string | null;
  shouldHighlightNode?: (nodeId: string) => boolean;
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

export const TreeNode: React.FC<TreeNodeProps> = ({ node, level, centrosCostoDefault, departamentosDefault, forceExpanded, highlightedNodeId, shouldHighlightNode }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [configExpanded, setConfigExpanded] = useState(false);
  
  // Efecto para manejar el colapso/expansión forzado
  useEffect(() => {
    if (forceExpanded !== undefined) {
      setIsExpanded(forceExpanded);
      setConfigExpanded(false);
    }
  }, [forceExpanded]);
  const [isEditing, setIsEditing] = useState(false);
  const [showCuentaDialog, setShowCuentaDialog] = useState(false);
  const [showGrupoDialog, setShowGrupoDialog] = useState(false);
  const [showCentroCostoDialog, setShowCentroCostoDialog] = useState(false);
  const [showDepartamentoDialog, setShowDepartamentoDialog] = useState(false);
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
  const [departamentosExpandido, setDepartamentosExpandido] = useState(false);

  const { actualizarNodo, eliminarNodo, agregarNodo, agregarNodoGrupoCuentas, cuentas, centrosCosto, departamentos, gruposCuentas } = useAppStore();

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
    // Solo permitir edición de nombre para nodos tipo grupo y medida
    if (node.tipo === 'grupo' || node.tipo === 'medida') {
      setIsEditing(!isEditing);
    }
  };

  const handleSelectCuenta = (cuentas: CuentaContable[]) => {
    cuentas.forEach(cuenta => {
      agregarNodo(node.id, 'cuenta', cuenta, centrosCostoDefault, departamentosDefault);
    });
    setShowCuentaDialog(false);
  };

  const handleSelectGrupo = (grupos: GrupoCuentas[]) => {
    grupos.forEach(grupo => {
      agregarNodoGrupoCuentas(node.id, grupo);
    });
    setShowGrupoDialog(false);
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

  const handleAddChild = (tipo: 'grupo' | 'cuenta' | 'medida') => {
    agregarNodo(node.id, tipo, undefined, centrosCostoDefault, departamentosDefault);
  };

  const handleCentroCostoSave = (centrosCosto: string[]) => {
    actualizarNodo(node.id, { centrosCosto });
  };

  const handleDepartamentoSave = (departamentos: string[]) => {
    actualizarNodo(node.id, { departamentos });
  };

  const handleInvertirValorChange = (checked: boolean) => {
    actualizarNodo(node.id, { invertirValor: checked });
  };

  const isDropTarget = isDragging && attributes['aria-describedby'] === 'droppable';

  // Determinar si este nodo está resaltado
  const isHighlighted = shouldHighlightNode ? shouldHighlightNode(node.id) : highlightedNodeId === node.id;

  return (
    <>
      <div
        id={`node-${node.id}`}
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 p-3 border-0 rounded-lg mb-2.5 transition-all duration-200
          ${levelBorderColors[level % levelBorderColors.length]}
          ${isDropTarget ? 'ring-2 ring-blue-500 scale-105' : ''}
          ${isHighlighted ? 'ring-4 ring-yellow-400 bg-yellow-100 shadow-lg' : ''}
          ${node.tipo === 'grupo' ? 'bg-gray-100 hover:bg-gray-200' : 
            (node.tipo === 'cuenta' || node.tipo === 'medida') ? 'bg-white hover:bg-gray-50' : ''}
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
        {/* Ícono de grupo, cuenta o medida */}
        {node.tipo === 'grupo' ? (
          <Folder className="w-5 h-5 text-blue-600 mr-1 group-hover:text-blue-700 transition-colors" />
        ) : node.tipo === 'cuenta' ? (
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-300 text-black text-lg font-bold mr-1 border border-yellow-400 shadow-sm" style={{fontFamily: 'monospace'}}>¢</span>
        ) : (
          <Calculator className="w-5 h-5 text-purple-600 mr-1 group-hover:text-purple-700 transition-colors" />
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
          <div className="flex-1 flex items-center gap-3">
            <div className="cursor-pointer" onClick={toggleEdit} style={{ cursor: node.tipo === 'grupo' || node.tipo === 'medida' ? 'pointer' : 'default' }}>
              <div className="font-medium group-hover:text-gray-800 transition-colors">{node.nombre}</div>
              {(node.tipo === 'cuenta' || node.tipo === 'medida') && (!node.centrosCosto || node.centrosCosto.length === 0) && (
                <div className="mt-1 text-xs text-red-700 font-semibold">Seleccione los centros de costo</div>
              )}
            </div>
            
            {/* Invertir Valor y botón de configuración para cuentas y medidas */}
            {(node.tipo === 'cuenta' || node.tipo === 'medida') && (
              <div className="flex items-center gap-3 ml-auto">
                <div className="flex items-center gap-2">
                  <Switch
                    id={`invertir-valor-${node.id}`}
                    checked={node.invertirValor || false}
                    onCheckedChange={handleInvertirValorChange}
                  />
                  <Label htmlFor={`invertir-valor-${node.id}`} className="text-sm">Invertir Valor</Label>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-6 w-6 hover:bg-gray-100"
                  onClick={e => { e.stopPropagation(); setConfigExpanded(!configExpanded); }}
                  aria-label={configExpanded ? 'Colapsar configuración' : 'Expandir configuración'}
                >
                  {configExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-1">
          {node.tipo === 'grupo' && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAddChild('grupo')}
                className="hover:bg-gray-100"
              >
                <Plus className="w-4 h-4 mr-1" /> Grupo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCuentaDialog(true)}
                className="hover:bg-gray-100"
              >
                <Plus className="w-4 h-4 mr-1" /> Cuenta
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGrupoDialog(true)}
                className="hover:bg-blue-100 text-blue-700"
              >
                <Plus className="w-4 h-4 mr-1" /> Grupo Cuentas
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAddChild('medida')}
                className="hover:bg-gray-100"
              >
                <Plus className="w-4 h-4 mr-1" /> Medida
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDeleteNode}
            className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </div>

      {/* Nueva sección de configuración expandible para cuentas y medidas */}
      {(node.tipo === 'cuenta' || node.tipo === 'medida') && configExpanded && (
        <div style={{ marginLeft: `${level * 24 + 48}px` }} className="mr-4 mt-2 mb-2">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="space-y-4">
              {/* Selector de Departamentos */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-sm font-semibold text-gray-700">Departamentos</Label>
                  <Button variant="outline" size="sm" onClick={() => setShowDepartamentoDialog(true)}>
                    Seleccionar
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-6 w-6 hover:bg-gray-100"
                    onClick={e => { e.stopPropagation(); setDepartamentosExpandido(!departamentosExpandido); }}
                    aria-label={departamentosExpandido ? 'Colapsar' : 'Expandir'}
                  >
                    {departamentosExpandido ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </Button>
                  <span className="text-sm text-gray-600">
                    {node.departamentos && node.departamentos.length > 0
                      ? `${node.departamentos.length} departamentos seleccionados`
                      : '0 departamentos seleccionados'}
                  </span>
                </div>
                {departamentosExpandido && node.departamentos && node.departamentos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-white rounded border">
                    {node.departamentos.map(deptoId => {
                      // Buscar por idNetsuite o por id como string
                      const depto = departamentos.find(d => d.idNetsuite === deptoId || d.id.toString() === deptoId);
                      
                      if (!depto) {
                        console.warn(`No se encontró departamento con id: ${deptoId}`);
                        return null;
                      }
                      
                      return (
                        <span key={depto.id} className="inline-flex items-center bg-green-100 text-green-800 rounded-full px-3 py-1 text-xs font-medium hover:bg-green-200 transition-colors">
                          {depto.nombre}
                          <button
                            type="button"
                            className="ml-2 text-green-800 hover:text-red-600 focus:outline-none"
                            onClick={e => {
                              e.stopPropagation();
                              const nuevos = node.departamentos.filter(id => id !== deptoId);
                              actualizarNodo(node.id, { departamentos: nuevos });
                            }}
                            aria-label="Eliminar departamento"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selector de Centros de Costo */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-sm font-semibold text-gray-700">Centros de Costo</Label>
                  <Button variant="outline" size="sm" onClick={() => setShowCentroCostoDialog(true)}>
                    Seleccionar
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-6 w-6 hover:bg-gray-100"
                    onClick={e => { e.stopPropagation(); setCentrosCostoExpandido(!centrosCostoExpandido); }}
                    aria-label={centrosCostoExpandido ? 'Colapsar' : 'Expandir'}
                  >
                    {centrosCostoExpandido ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </Button>
                  <span className="text-sm text-gray-600">
                    {node.centrosCosto && node.centrosCosto.length > 0
                      ? `${node.centrosCosto.length} centros seleccionados`
                      : '0 centros seleccionados'}
                  </span>
                </div>
                {centrosCostoExpandido && node.centrosCosto && node.centrosCosto.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-white rounded border">
                    {node.centrosCosto.map(centroId => {
                      const centro = centrosCosto.find(c => c.idNetsuite === centroId);
                      
                      if (!centro) {
                        console.warn(`No se encontró centro de costo con idNetsuite: ${centroId}`);
                        return null;
                      }
                      
                      return (
                        <span key={centro.idNetsuite} className="inline-flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-xs font-medium hover:bg-blue-200 transition-colors">
                          {centro.nombre} ({centro.tipo})
                          <button
                            type="button"
                            className="ml-2 text-blue-800 hover:text-red-600 focus:outline-none"
                            onClick={e => {
                              e.stopPropagation();
                              const nuevos = node.centrosCosto.filter(id => id !== centroId);
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
            </div>
          </div>
        </div>
      )}

      {isExpanded && node.hijos && node.hijos.length > 0 && (
        <SortableContext
          items={node.hijos.map(child => child.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2.5">
            {node.hijos.map((child) => (
              <TreeNode
                key={child.id}
                node={{
                  ...child,
                  centrosCosto: child.centrosCosto || [],
                  departamentos: child.departamentos || []
                }}
                level={level + 1}
                centrosCostoDefault={centrosCostoDefault}
                departamentosDefault={departamentosDefault}
                forceExpanded={forceExpanded}
                highlightedNodeId={highlightedNodeId}
                shouldHighlightNode={shouldHighlightNode}
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

      <SelectGrupoDialog
        isOpen={showGrupoDialog}
        onClose={() => setShowGrupoDialog(false)}
        onSelect={handleSelectGrupo}
        grupos={gruposCuentas}
        cuentas={cuentas}
      />

      <CentroCostoSelector
        isOpen={showCentroCostoDialog}
        onClose={() => setShowCentroCostoDialog(false)}
        onSave={handleCentroCostoSave}
        centrosCosto={centrosCosto}
        centrosCostoDefault={node.centrosCosto || centrosCostoDefault}
      />

      <DepartamentoSelector
        isOpen={showDepartamentoDialog}
        onClose={() => setShowDepartamentoDialog(false)}
        onSave={handleDepartamentoSave}
        departamentos={departamentos}
        departamentosDefault={node.departamentos || departamentosDefault}
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