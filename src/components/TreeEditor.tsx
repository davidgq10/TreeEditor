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
import { Plus, Download, Check, X, ChevronDown, ChevronRight, Upload, Minimize2, Maximize2, Search, MapPin, ArrowUp, ArrowDown, ChevronUp } from 'lucide-react';
import { exportarAExcel, exportarAExcelDesnormalizado, importFromExcel } from '../services/excel';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from './ui/select';
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
import { SelectGrupoDialog } from './SelectGrupoDialog';
import { ExportProgressDialog, ExportProgress } from './ExportProgressDialog';
import { Formato, Nodo, CuentaContable, GrupoCuentas } from '../types';
import { Alert } from './ui/alert';

export const TreeEditor: React.FC = () => {
  const {
    formatos,
    formatoActual,
    agregarNodo,
    agregarNodoGrupoCuentas,
    moverNodo,
    centrosCosto,
    departamentos,
    agregarFormato,
    actualizarFormatoDefaults,
    cuentas,
    gruposCuentas
  } = useAppStore();

  const [centrosCostoDefault, setCentrosCostoDefault] = useState<string[]>([]);
  const [departamentosDefault, setDepartamentosDefault] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtroTipoCentros, setFiltroTipoCentros] = useState<string>('');
  const [filtroTipoDepartamentos, setFiltroTipoDepartamentos] = useState<string>('');
  const [departamentosDialogOpen, setDepartamentosDialogOpen] = useState(false);
  const [searchTermCentros, setSearchTermCentros] = useState<string>('');
  const [searchTermDepartamentos, setSearchTermDepartamentos] = useState<string>('');
  const [isAddCuentaDialogOpen, setIsAddCuentaDialogOpen] = useState(false);
  const [showCuentaSelector, setShowCuentaSelector] = useState(false);
  const [showGrupoSelector, setShowGrupoSelector] = useState(false);
  const [centrosCostoExpandido, setCentrosCostoExpandido] = useState(false);
  const [departamentosExpandido, setDepartamentosExpandido] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [missingCuentas, setMissingCuentas] = useState<string[]>([]);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [allExpanded, setAllExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Array<{nodeId: string, path: string[], cuenta: CuentaContable}>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [isSearchFixed, setIsSearchFixed] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [showProgressDialog, setShowProgressDialog] = useState(false);

  const formato = formatos.find(f => f.id === formatoActual);

  useEffect(() => {
    if (formato) {
      setCentrosCostoDefault(formato.centrosCostoDefault || []);
      setDepartamentosDefault(formato.departamentosDefault || []);
    }
  }, [formato]);

  // Efecto para manejar el scroll y fijar la sección de búsqueda
  useEffect(() => {
    const handleScrollForButtons = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowScrollToTop(scrollTop > 300);
      
      const searchSection = document.getElementById('search-section');
      if (searchSection) {
        const rect = searchSection.getBoundingClientRect();
        // Solo mostrar fixed si hay término de búsqueda activo
        setIsSearchFixed(rect.top <= 0 && searchTerm.trim() !== '');
      }
    };

    window.addEventListener('scroll', handleScrollForButtons);
    return () => window.removeEventListener('scroll', handleScrollForButtons);
  }, [searchTerm]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Función recursiva para buscar cuentas en la estructura del árbol
  const searchAccountsInTree = (nodes: Nodo[], searchTerm: string, currentPath: string[] = []): Array<{nodeId: string, path: string[], cuenta: CuentaContable}> => {
    const results: Array<{nodeId: string, path: string[], cuenta: CuentaContable}> = [];
    
    nodes.forEach(node => {
      const nodePath = [...currentPath, node.nombre];
      
      // Buscar en nodos tipo 'cuenta' o 'medida' que tengan una cuenta asociada
      if ((node.tipo === 'cuenta' || node.tipo === 'medida') && node.cuenta) {
        const matchesCodigo = node.cuenta.codigo.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesNombre = node.cuenta.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (matchesCodigo || matchesNombre) {
          results.push({
            nodeId: node.id,
            path: nodePath,
            cuenta: node.cuenta
          });
        }
      }
      
      // Buscar recursivamente en los hijos
      if (node.hijos.length > 0) {
        const childResults = searchAccountsInTree(node.hijos, searchTerm, nodePath);
        results.push(...childResults);
      }
    });
    
    return results;
  };

  // Función para realizar la búsqueda
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    
    if (!term.trim() || !formato) {
      setSearchResults([]);
      setShowSearchResults(false);
      setHighlightedNodeId(null);
      setCurrentResultIndex(0);
      return;
    }
    
    const results = searchAccountsInTree(formato.estructura, term.trim());
    setSearchResults(results);
    setShowSearchResults(results.length > 0);
    setCurrentResultIndex(0);
    
    // Si hay resultados, resaltar el primero
    if (results.length > 0) {
      setHighlightedNodeId(results[0].nodeId);
    } else {
      setHighlightedNodeId(null);
    }
  };

  // Función para navegar a un resultado específico
  const navigateToResult = (nodeId: string) => {
    const resultIndex = searchResults.findIndex(result => result.nodeId === nodeId);
    if (resultIndex !== -1) {
      setCurrentResultIndex(resultIndex);
    }
    setHighlightedNodeId(nodeId);
    setAllExpanded(true); // Expandir todo para mostrar el nodo
    
    // Scroll al nodo después de un pequeño delay para permitir la expansión
    setTimeout(() => {
      const element = document.getElementById(`node-${nodeId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Función para navegar al siguiente resultado
  const navigateToNext = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentResultIndex + 1) % searchResults.length;
    setCurrentResultIndex(nextIndex);
    const nextResult = searchResults[nextIndex];
    setHighlightedNodeId(nextResult.nodeId);
    setAllExpanded(true);
    
    setTimeout(() => {
      const element = document.getElementById(`node-${nextResult.nodeId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Función para navegar al resultado anterior
  const navigateToPrevious = () => {
    if (searchResults.length === 0) return;
    const prevIndex = currentResultIndex === 0 ? searchResults.length - 1 : currentResultIndex - 1;
    setCurrentResultIndex(prevIndex);
    const prevResult = searchResults[prevIndex];
    setHighlightedNodeId(prevResult.nodeId);
    setAllExpanded(true);
    
    setTimeout(() => {
      const element = document.getElementById(`node-${prevResult.nodeId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Función para verificar si un nodo debe estar resaltado
  const shouldHighlightNode = (nodeId: string) => {
    if (!searchTerm.trim()) return false;
    return searchResults.some(result => result.nodeId === nodeId);
  };

  // Función para scroll hacia arriba
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

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
      const newDefaults = checked 
        ? [...prev, centroId]
        : prev.filter(id => id !== centroId);
      
      // Actualizar el formato con los nuevos valores por defecto
      if (formato) {
        actualizarFormatoDefaults(formato.id, newDefaults, undefined);
      }
      
      return newDefaults;
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
        centrosCostoList: centrosCosto,
        departamentosList: departamentos
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
      agregarNodo(null, 'cuenta', cuenta, centrosCostoDefault, departamentosDefault);
    });
  };

  const handleAddGrupoCuentas = (grupos: GrupoCuentas[]) => {
    grupos.forEach(grupo => {
      agregarNodoGrupoCuentas(null, grupo);
    });
  };

  // Función recursiva para recolectar cuentas sin centros de costo
  function getCuentasSinAsignaciones(nodos: Nodo[], tipo: 'centros' | 'departamentos'): string[] {
    let result: string[] = [];
    nodos.forEach(nodo => {
      const sinAsignacion = tipo === 'centros'
        ? !nodo.centrosCosto || nodo.centrosCosto.length === 0
        : !nodo.departamentos || nodo.departamentos.length === 0;

      if ((nodo.tipo === 'cuenta' || nodo.tipo === 'medida') && sinAsignacion) {
        result.push(`${nodo.cuenta?.codigo || ''} ${nodo.cuenta?.nombre || nodo.nombre}`.trim());
      }

      if (nodo.hijos.length > 0) {
        result = result.concat(getCuentasSinAsignaciones(nodo.hijos, tipo));
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
            onClick={() => agregarNodo(null, 'grupo', undefined, centrosCostoDefault, departamentosDefault)}
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
            onClick={() => setShowGrupoSelector(true)}
            variant="outline"
            size="sm"
            className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Grupo
          </Button>
          <Button
            onClick={() => agregarNodo(null, 'medida', undefined, centrosCostoDefault, departamentosDefault)}
            variant="outline"
            size="sm"
            className="bg-gray-50 hover:bg-gray-100 border-gray-300"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Medida
          </Button>
          <Button
            onClick={() => setAllExpanded(false)}
            variant="outline"
            size="sm"
            className="bg-gray-50 hover:bg-gray-100 border-gray-300"
          >
            <Minimize2 className="w-4 h-4 mr-2" />
            Colapsar Todo
          </Button>
          <Button
            onClick={() => setAllExpanded(true)}
            variant="outline"
            size="sm"
            className="bg-gray-50 hover:bg-gray-100 border-gray-300"
          >
            <Maximize2 className="w-4 h-4 mr-2" />
            Expandir Todo
          </Button>
          <Button
            onClick={async () => {
              setExportError(null);
              setExportSuccess(null);
              if (!formato) return;

              const cuentasSinCentros = getCuentasSinAsignaciones(formato.estructura, 'centros');
              if (cuentasSinCentros.length > 0) {
                setMissingCuentas(cuentasSinCentros);
                setShowMissingModal(true);
                return;
              }

              const cuentasSinDepartamentos = getCuentasSinAsignaciones(formato.estructura, 'departamentos');
              if (cuentasSinDepartamentos.length > 0) {
                // Podrías crear otro estado y modal para esto, o reutilizar el existente
                setMissingCuentas(cuentasSinDepartamentos);
                setShowMissingModal(true); // Reutilizando el modal por simplicidad
                return;
              }

              try {
                const buffer = await exportarAExcel({ 
                  formato, 
                  datos: {}, 
                  centrosCostoList: centrosCosto, 
                  departamentosList: departamentos 
                });
                const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
          <Button
            onClick={async () => {
              setExportError(null);
              setExportSuccess(null);
              if (!formato) return;

              const cuentasSinCentros = getCuentasSinAsignaciones(formato.estructura, 'centros');
              if (cuentasSinCentros.length > 0) {
                setMissingCuentas(cuentasSinCentros);
                setShowMissingModal(true);
                return;
              }

              const cuentasSinDepartamentos = getCuentasSinAsignaciones(formato.estructura, 'departamentos');
              if (cuentasSinDepartamentos.length > 0) {
                setMissingCuentas(cuentasSinDepartamentos);
                setShowMissingModal(true);
                return;
              }

              try {
                // Inicializar el progreso
                setExportProgress({
                  status: 'preparing',
                  currentRow: 0,
                  totalRows: 0,
                  currentPhase: 'Preparando exportación...'
                });
                setShowProgressDialog(true);

                const buffer = await exportarAExcelDesnormalizado({ 
                  formato, 
                  datos: {}, 
                  centrosCostoList: centrosCosto, 
                  departamentosList: departamentos,
                  onProgress: (current: number, total: number, phase: string) => {
                    setExportProgress({
                      status: 'processing',
                      currentRow: current,
                      totalRows: total,
                      currentPhase: phase
                    });
                  }
                });
                
                // Finalización
                setExportProgress(prev => prev ? {
                  ...prev,
                  status: 'finalizing',
                  currentPhase: 'Descargando archivo...'
                } : null);
                
                const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${formato.nombre}_desnormalizado.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                // Completado
                setExportProgress(prev => prev ? {
                  ...prev,
                  status: 'complete',
                  currentPhase: '¡Exportación completada!'
                } : null);
                
                // Cerrar el diálogo después de 2 segundos
                setTimeout(() => {
                  setShowProgressDialog(false);
                  setExportProgress(null);
                }, 2000);
              } catch (error) {
                console.error('Error en exportación:', error);
                setExportProgress({
                  status: 'error',
                  currentRow: 0,
                  totalRows: 0,
                  currentPhase: 'Error',
                  errorMessage: error instanceof Error ? error.message : 'Ocurrió un error al exportar a Excel desnormalizado.'
                });
              }
            }}
            variant="outline"
            size="sm"
            className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Excel expansión de combinaciones
          </Button>
        </div>
      </div>
      
      {/* 3. Departamentos y Centros de costo por defecto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="p-4">
        <div className="space-y-2">
          <Label className="text-lg font-semibold">Departamentos por Defecto</Label>
          <div>
            <Dialog open={departamentosDialogOpen} onOpenChange={setDepartamentosDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {departamentosDefault.length > 0
                    ? `${departamentosDefault.length} departamentos seleccionados` : "Seleccionar departamentos"}
                  <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Seleccionar Departamentos</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const deptosFiltrados = departamentos.filter(d => {
                          const matchesType = !filtroTipoDepartamentos || d.tipo === filtroTipoDepartamentos;
                          const matchesSearch = !searchTermDepartamentos || 
                            (d.nombre && d.nombre.toLowerCase().includes(searchTermDepartamentos.toLowerCase())) ||
                            (d.nombre_completo && d.nombre_completo.toLowerCase().includes(searchTermDepartamentos.toLowerCase())) ||
                            (d.tipo && d.tipo.toLowerCase().includes(searchTermDepartamentos.toLowerCase()));
                          return matchesType && matchesSearch;
                        });
                        const deptosAgregar = deptosFiltrados.map(d => String(d.id));
                        const nuevosSeleccionados = new Set([...departamentosDefault, ...deptosAgregar]);
                        const newDefaults = Array.from(nuevosSeleccionados);
                        setDepartamentosDefault(newDefaults);
                        
                        // Actualizar el formato con los nuevos valores por defecto
                        if (formato) {
                          actualizarFormatoDefaults(formato.id, undefined, newDefaults);
                        }
                      }}
                    >
                      Seleccionar todo
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDepartamentosDefault([]);
                        
                        // Actualizar el formato con los nuevos valores por defecto
                        if (formato) {
                          actualizarFormatoDefaults(formato.id, undefined, []);
                        }
                      }}
                    >
                      Quitar todo
                    </Button>
                  </div>
                  
                  {/* Botones para seleccionar por tipo */}
                  {(() => {
                    const deptosFiltrados = departamentos.filter(d => {
                      const matchesSearch = !searchTermDepartamentos || 
                        (d.nombre && d.nombre.toLowerCase().includes(searchTermDepartamentos.toLowerCase())) ||
                        (d.nombre_completo && d.nombre_completo.toLowerCase().includes(searchTermDepartamentos.toLowerCase())) ||
                        (d.tipo && d.tipo.toLowerCase().includes(searchTermDepartamentos.toLowerCase()));
                      return matchesSearch;
                    });
                    const tiposUnicos = Array.from(new Set(deptosFiltrados.map(d => d.tipo).filter(Boolean))).sort();
                    
                    if (tiposUnicos.length > 1) {
                      return (
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
                                onClick={() => {
                                  const deptosDelTipo = deptosFiltrados
                                    .filter(d => d.tipo === tipo)
                                    .map(d => String(d.id));
                                  setDepartamentosDefault(prev => {
                                    const nuevosSeleccionados = new Set([...prev, ...deptosDelTipo]);
                                    const newDefaults = Array.from(nuevosSeleccionados);
                                    
                                    // Actualizar el formato con los nuevos valores por defecto
                                    if (formato) {
                                      actualizarFormatoDefaults(formato.id, undefined, newDefaults);
                                    }
                                    
                                    return newDefaults;
                                  });
                                }}
                              >
                                {tipo}
                              </Button>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <div className="space-y-2">
                    <Label htmlFor="search-departamentos">Buscar:</Label>
                    <Input
                      id="search-departamentos"
                      placeholder="Buscar por nombre o tipo..."
                      value={searchTermDepartamentos}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTermDepartamentos(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-auto">
                  {departamentos
                    .filter(depto => {
                      const matchesType = !filtroTipoDepartamentos || depto.tipo === filtroTipoDepartamentos;
                      const matchesSearch = !searchTermDepartamentos || 
                        (depto.nombre && depto.nombre.toLowerCase().includes(searchTermDepartamentos.toLowerCase())) ||
                        (depto.nombre_completo && depto.nombre_completo.toLowerCase().includes(searchTermDepartamentos.toLowerCase())) ||
                        (depto.tipo && depto.tipo.toLowerCase().includes(searchTermDepartamentos.toLowerCase()));
                      return matchesType && matchesSearch;
                    })
                    .map((depto) => (
                    <div key={depto.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`depto-${depto.id}`}
                        checked={departamentosDefault.includes(String(depto.id))}
                        onCheckedChange={(checked) => {
                          const deptoId = String(depto.id);
                          const newDefaults = checked 
                            ? [...departamentosDefault, deptoId] 
                            : departamentosDefault.filter(id => id !== deptoId);
                          setDepartamentosDefault(newDefaults);
                          
                          // Actualizar el formato con los nuevos valores por defecto
                          if (formato) {
                            actualizarFormatoDefaults(formato.id, undefined, newDefaults);
                          }
                        }}
                      />
                      <label
                        htmlFor={`depto-${depto.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {depto.nombre_completo || depto.nombre} {depto.tipo && `(${depto.tipo})`}
                      </label>
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button onClick={() => setDepartamentosDialogOpen(false)}>
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
                  onClick={() => setDepartamentosExpandido((v) => !v)}
                  aria-label={departamentosExpandido ? 'Colapsar' : 'Expandir'}
                >
                  {departamentosExpandido ? <ChevronDown /> : <ChevronRight />}
                </Button>
                <span className="text-sm text-gray-600 align-middle">
                  {departamentosDefault.length} departamentos seleccionados
                </span>
                {!departamentosExpandido && (
                  <span
                    className="ml-2 text-xs text-gray-500 align-middle max-w-[350px] truncate inline-block align-bottom"
                    title={departamentosDefault.length > 0 ? departamentosDefault.map(id => {
                      const depto = departamentos.find(d => d.id.toString() === id);
                      return depto ? `${depto.nombre_completo || depto.nombre} ${depto.tipo ? `(${depto.tipo})` : ''}` : '';
                    }).filter(Boolean).join(', ') : ''}
                  >
                    {departamentosDefault.length > 0 &&
                      `(${departamentosDefault.map(id => {
                        const depto = departamentos.find(d => d.id.toString() === id);
                        return depto ? `${depto.nombre_completo || depto.nombre} ${depto.tipo ? `(${depto.tipo})` : ''}` : '';
                      }).filter(Boolean).join(', ')})`}
                  </span>
                )}
              </div>
              {departamentosExpandido && (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border rounded p-2 bg-gray-50">
                  {departamentosDefault.map((id) => {
                    const depto = departamentos.find((d) => d.id.toString() === id);
                    if (!depto) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center bg-green-100 text-green-800 rounded-full px-3 py-1 text-xs font-medium"
                      >
                        {depto.nombre_completo || depto.nombre} {depto.tipo && `(${depto.tipo})`}
                        <button
                          type="button"
                          className="ml-2 text-green-800 hover:text-red-600 focus:outline-none"
                          onClick={() => {
                            const newDefaults = departamentosDefault.filter((did) => did !== id);
                            setDepartamentosDefault(newDefaults);
                            
                            // Actualizar el formato con los nuevos valores por defecto
                            if (formato) {
                              actualizarFormatoDefaults(formato.id, undefined, newDefaults);
                            }
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
          </div>
        </div>
      </Card>

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
                <div className="space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const centrosFiltrados = centrosCosto.filter(c => {
                          if (!c.idNetsuite) return false;
                          const matchesType = !filtroTipoCentros || c.tipo === filtroTipoCentros;
                          const matchesSearch = !searchTermCentros || 
                            c.nombre.toLowerCase().includes(searchTermCentros.toLowerCase()) ||
                            c.tipo.toLowerCase().includes(searchTermCentros.toLowerCase());
                          return matchesType && matchesSearch;
                        });
                        const centrosAgregar = centrosFiltrados.map(c => c.idNetsuite as string);
                        const nuevosSeleccionados = new Set([...centrosCostoDefault, ...centrosAgregar]);
                        const newDefaults = Array.from(nuevosSeleccionados);
                        setCentrosCostoDefault(newDefaults);
                        
                        // Actualizar el formato con los nuevos valores por defecto
                        if (formato) {
                          actualizarFormatoDefaults(formato.id, newDefaults, undefined);
                        }
                      }}
                    >
                      Seleccionar todo
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCentrosCostoDefault([]);
                        
                        // Actualizar el formato con los nuevos valores por defecto
                        if (formato) {
                          actualizarFormatoDefaults(formato.id, [], undefined);
                        }
                      }}
                    >
                      Quitar todo
                    </Button>
                  </div>
                  
                  {/* Botones para seleccionar por tipo */}
                  {(() => {
                    const centrosFiltrados = centrosCosto.filter(c => {
                      if (!c.idNetsuite) return false;
                      const matchesSearch = !searchTermCentros || 
                        c.nombre.toLowerCase().includes(searchTermCentros.toLowerCase()) ||
                        c.tipo.toLowerCase().includes(searchTermCentros.toLowerCase());
                      return matchesSearch;
                    });
                    const tiposUnicos = Array.from(new Set(centrosFiltrados.map(c => c.tipo).filter(Boolean))).sort();
                    
                    if (tiposUnicos.length > 1) {
                      return (
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
                                onClick={() => {
                                  const centrosDelTipo = centrosFiltrados
                                    .filter(c => c.tipo === tipo)
                                    .map(c => c.idNetsuite as string);
                                  setCentrosCostoDefault(prev => {
                                    const nuevosSeleccionados = new Set([...prev, ...centrosDelTipo]);
                                    const newDefaults = Array.from(nuevosSeleccionados);
                                    
                                    // Actualizar el formato con los nuevos valores por defecto
                                    if (formato) {
                                      actualizarFormatoDefaults(formato.id, newDefaults, undefined);
                                    }
                                    
                                    return newDefaults;
                                  });
                                }}
                              >
                                {tipo}
                              </Button>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <div className="space-y-2">
                    <Label htmlFor="search-centros">Buscar:</Label>
                    <Input
                      id="search-centros"
                      placeholder="Buscar por nombre o tipo..."
                      value={searchTermCentros}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTermCentros(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-auto">
                  {centrosCosto
                    .filter(centro => {
                      const matchesType = !filtroTipoCentros || centro.tipo === filtroTipoCentros;
                      const matchesSearch = !searchTermCentros || 
                        centro.nombre.toLowerCase().includes(searchTermCentros.toLowerCase()) ||
                        centro.tipo.toLowerCase().includes(searchTermCentros.toLowerCase());
                      return matchesType && matchesSearch;
                    })
                    .map((centro) => (
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
                      const centro = centrosCosto.find(c => c.idNetsuite === id);
                      return centro ? `${centro.nombre} (${centro.tipo})` : '';
                    }).filter(Boolean).join(', ') : ''}
                  >
                    {centrosCostoDefault.length > 0 &&
                      `(${centrosCostoDefault.map(id => {
                        const centro = centrosCosto.find(c => c.idNetsuite === id);
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
                          onClick={() => {
                            const newDefaults = centrosCostoDefault.filter((cid) => cid !== id);
                            setCentrosCostoDefault(newDefaults);
                            
                            // Actualizar el formato con los nuevos valores por defecto
                            if (formato) {
                              actualizarFormatoDefaults(formato.id, newDefaults, undefined);
                            }
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
      </Card>
      </div>

      {/* 5. Búsqueda de cuentas */}
      <div id="search-section" className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="space-y-3">
          <Label className="text-lg font-semibold">Buscar Cuenta</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por código o nombre de cuenta..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchResults.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigateToPrevious}
                  className="px-3"
                  title="Resultado anterior"
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigateToNext}
                  className="px-3"
                  title="Siguiente resultado"
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
              </>
            )}
            {searchTerm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSearch('')}
                className="px-3"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {/* Contador de resultados */}
          {searchResults.length > 0 && (
            <div className="text-sm text-gray-600">
              Resultado {currentResultIndex + 1} de {searchResults.length}
            </div>
          )}
          
          {/* Resultados de búsqueda */}
          {showSearchResults && (
            <div className="mt-3">
              <div className="text-sm text-gray-600 mb-2">
                {searchResults.length} cuenta{searchResults.length !== 1 ? 's' : ''} encontrada{searchResults.length !== 1 ? 's' : ''}:
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
                {searchResults.map((result, index) => (
                  <div
                    key={`${result.nodeId}-${index}`}
                    className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                      index === currentResultIndex 
                        ? 'bg-blue-100 border-blue-300' 
                        : 'bg-white hover:bg-blue-50'
                    }`}
                    onClick={() => navigateToResult(result.nodeId)}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {result.cuenta.codigo} - {result.cuenta.nombre}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {result.path.join(' > ')}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-6 w-6"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {searchTerm && !showSearchResults && (
            <div className="text-sm text-gray-500 italic">
              No se encontraron cuentas que coincidan con "{searchTerm}"
            </div>
          )}
        </div>
      </div>

      {/* Sección de búsqueda fija - solo cuando hay filtro activo */}
      {isSearchFixed && searchTerm.trim() !== '' && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-lg border-b p-4" style={{ maxWidth: "115%", margin: "0 auto" }}>
          <div className="space-y-3" style={{ maxWidth: "calc(115% - 2rem)", margin: "0 auto" }}>
            <Label className="text-lg font-semibold">Buscar Cuenta</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por código o nombre de cuenta..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchResults.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={navigateToPrevious}
                    className="px-3"
                    title="Resultado anterior"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={navigateToNext}
                    className="px-3"
                    title="Siguiente resultado"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                </>
              )}
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSearch('')}
                  className="px-3"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            {/* Contador de resultados */}
            {searchResults.length > 0 && (
              <div className="text-sm text-gray-600">
                Resultado {currentResultIndex + 1} de {searchResults.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Espaciador cuando la búsqueda está fija */}
      {isSearchFixed && searchTerm.trim() !== '' && <div className="h-32"></div>}

      {/* 6. Árbol de estructura */}
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
                    centrosCosto: (node.centrosCosto || []).filter(id => centrosCosto.some(c => c.idNetsuite === id)),
                    departamentos: (node.departamentos || []).filter(id => departamentos.some(d => String(d.id) === id)),
                  }}
                  level={0}
                  centrosCostoDefault={centrosCostoDefault}
                  departamentosDefault={departamentosDefault}
                  forceExpanded={allExpanded}
                  highlightedNodeId={highlightedNodeId}
                  shouldHighlightNode={shouldHighlightNode}
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
        cuentas={cuentas}
        multiple={true}
      />

      <SelectGrupoDialog
        isOpen={showGrupoSelector}
        onClose={() => setShowGrupoSelector(false)}
        onSelect={handleAddGrupoCuentas}
        grupos={gruposCuentas}
        cuentas={cuentas}
      />

      {/* Modal de advertencia por cuentas sin centros de costo */}
      <Dialog open={showMissingModal} onOpenChange={setShowMissingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No se puede exportar</DialogTitle>
          </DialogHeader>
          <div className="mb-2 text-red-700 font-semibold">Las siguientes cuentas o medidas no tienen centros de costo o departamentos asignados:</div>
          <ul className="mb-4 list-disc pl-6 text-sm text-red-700">
            {missingCuentas.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
          <div className="text-sm text-gray-600">Por favor, asigne al menos un centro de costo y un departamento a cada cuenta o medida antes de exportar.</div>
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

      {/* Diálogo de progreso de exportación */}
      {exportProgress && (
        <ExportProgressDialog
          isOpen={showProgressDialog}
          progress={exportProgress}
          onClose={() => {
            setShowProgressDialog(false);
            setExportProgress(null);
          }}
        />
      )}

      {/* Botón flotante para ir arriba */}
      {showScrollToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
          title="Ir arriba"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}; 