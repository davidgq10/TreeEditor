import { useState } from 'react';
import { CentroCosto } from '../types';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

export default function CentroCostoComponent() {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [centrosCosto, setCentrosCosto] = useState<CentroCosto[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!nombre || !tipo) {
      setError('Por favor complete todos los campos requeridos');
      return;
    }

    const nuevoCentro: CentroCosto = {
      id: uuidv4(),
      nombre,
      tipo
    };

    setCentrosCosto(prev => [...prev, nuevoCentro]);
    setSuccess('Centro de costo agregado exitosamente');
    setNombre('');
    setTipo('');
  };

  const handleImport = async () => {
    if (!file) {
      setError('Por favor seleccione un archivo');
      return;
    }

    setImporting(true);
    setError('');
    setSuccess('');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!Array.isArray(jsonData)) {
        throw new Error('El archivo no contiene datos válidos');
      }

      const centros = jsonData.map((row: any) => {
        if (!row.nombre || !row.tipo) {
          throw new Error('El archivo debe contener las columnas "nombre" y "tipo"');
        }

        return {
          id: uuidv4(),
          nombre: row.nombre,
          tipo: row.tipo
        };
      });

      setCentrosCosto(prev => [...prev, ...centros]);
      setSuccess(`${centros.length} centros de costo importados exitosamente`);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar el archivo');
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = (id: string) => {
    setCentrosCosto(prev => prev.filter(centro => centro.id !== id));
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Centros de Costo</h2>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo *
            </label>
            <input
              type="text"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Agregar Centro de Costo
        </button>
      </form>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Importar desde Excel</h3>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50"
          >
            {importing ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Centros de Costo Registrados</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {centrosCosto.map((centro) => (
                <tr key={centro.id}>
                  <td className="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                    {centro.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                    {centro.tipo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                    <button
                      onClick={() => handleDelete(centro.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 