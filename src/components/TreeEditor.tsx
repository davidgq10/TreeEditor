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
import { Plus, Download, Check, X, ChevronDown, ChevronRight, Upload, Minimize2, Maximize2 } from 'lucide-react';
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
import { Formato, Nodo, CuentaContable } from '../types';
import { Alert } from './ui/alert';

export const TreeEditor: React.FC = () => {
  const {
    formatos,
    formatoActual,
    agregarNodo,
    moverNodo,
    centrosCosto,
    departamentos,
    agregarFormato
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

  const formato = formatos.find(f => f.id === formatoActual);

  useEffect(() => {
    if (formato) {
      setCentrosCostoDefault(formato.centrosCostoDefault || []);
      setDepartamentosDefault(formato.departamentosDefault || []);
    }
  }, [formato]);

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
                const buffer = await exportarAExcelDesnormalizado({ 
                  formato, 
                  datos: {}, 
                  centrosCostoList: centrosCosto, 
                  departamentosList: departamentos 
                });
                const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${formato.nombre}_desnormalizado.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                setExportSuccess('¡Exportación desnormalizada completada exitosamente!');
                setShowExportModal(true);
              } catch (error) {
                setExportError('Ocurrió un error al exportar a Excel desnormalizado.');
                setShowExportModal(true);
              }
            }}
            variant="outline"
            size="sm"
            className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Excel Desnormalizado
          </Button>
        </div>
      </div>
      
      {/* 3. Centros de costo y Departamentos por defecto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        setCentrosCostoDefault(centrosFiltrados.map(c => c.idNetsuite as string));
                      }}
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
                    {filtroTipoCentros && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const centrosPorTipo = centrosCosto.filter(c => 
                            c.idNetsuite && c.tipo === filtroTipoCentros
                          );
                          setCentrosCostoDefault(centrosPorTipo.map(c => c.idNetsuite as string));
                        }}
                      >
                        Seleccionar tipo: {filtroTipoCentros}
                      </Button>
                    )}
                  </div>
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
                  <div className="space-y-2">
                    <Label htmlFor="filtro-tipo-centros">Filtrar por tipo:</Label>
                    <Select
                      value={filtroTipoCentros}
                      onValueChange={setFiltroTipoCentros}
                    >
                      <SelectTrigger>
                        {filtroTipoCentros || 'Todos los tipos'}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos los tipos</SelectItem>
                        {Array.from(new Set(centrosCosto.map(c => c.tipo))).sort().map((tipo, index) => (
                          <SelectItem key={`centro-tipo-${index}-${tipo}`} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                            d.nombre.toLowerCase().includes(searchTermDepartamentos.toLowerCase()) ||
                            d.nombre_completo.toLowerCase().includes(searchTermDepartamentos.toLowerCase()) ||
                            d.tipo.toLowerCase().includes(searchTermDepartamentos.toLowerCase());
                          return matchesType && matchesSearch;
                        });
                        setDepartamentosDefault(deptosFiltrados.map(d => String(d.id)));
                      }}
                    >
                      Seleccionar todo
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setDepartamentosDefault([])}
                    >
                      Quitar todo
                    </Button>
                    {filtroTipoDepartamentos && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const deptosPorTipo = departamentos.filter(d => 
                            d.tipo === filtroTipoDepartamentos
                          );
                          setDepartamentosDefault(deptosPorTipo.map(d => String(d.id)));
                        }}
                      >
                        Seleccionar tipo: {filtroTipoDepartamentos}
                      </Button>
                    )}
                  </div>
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
                  <div className="space-y-2">
                    <Label htmlFor="filtro-tipo-departamentos">Filtrar por tipo:</Label>
                    <Select
                      value={filtroTipoDepartamentos}
                      onValueChange={setFiltroTipoDepartamentos}
                    >
                      <SelectTrigger>
                        {filtroTipoDepartamentos || 'Todos los tipos'}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos los tipos</SelectItem>
                        {Array.from(new Set(departamentos.map(d => d.tipo))).sort().map((tipo, index) => (
                          <SelectItem key={`depto-tipo-${index}-${tipo}`} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-auto">
                  {departamentos
                    .filter(depto => {
                      const matchesType = !filtroTipoDepartamentos || depto.tipo === filtroTipoDepartamentos;
                      const matchesSearch = !searchTermDepartamentos || 
                        depto.nombre.toLowerCase().includes(searchTermDepartamentos.toLowerCase()) ||
                        depto.nombre_completo.toLowerCase().includes(searchTermDepartamentos.toLowerCase()) ||
                        depto.tipo.toLowerCase().includes(searchTermDepartamentos.toLowerCase());
                      return matchesType && matchesSearch;
                    })
                    .map((depto) => (
                    <div key={depto.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`depto-${depto.id}`}
                        checked={departamentosDefault.includes(String(depto.id))}
                        onCheckedChange={(checked) => {
                          const deptoId = String(depto.id);
                          setDepartamentosDefault(prev => 
                            checked 
                              ? [...prev, deptoId] 
                              : prev.filter(id => id !== deptoId)
                          );
                        }}
                      />
                      <label
                        htmlFor={`depto-${depto.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {`${depto.nombre} (${depto.tipo})`}
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
              </div>
              {departamentosExpandido && (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border rounded p-2 bg-gray-50">
                  {departamentosDefault.map((id) => {
                    const depto = departamentos.find((d) => String(d.id) === id);
                    if (!depto) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center bg-green-100 text-green-800 rounded-full px-3 py-1 text-xs font-medium"
                      >
                        {depto.nombre}
                        <button
                          type="button"
                          className="ml-2 text-green-800 hover:text-red-600 focus:outline-none"
                          onClick={() => setDepartamentosDefault((prev) => prev.filter((did) => did !== id))}
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
      </div>

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
    </div>
  );
}; 