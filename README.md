# Editor de Formatos Financieros

Una aplicación de escritorio para crear y gestionar estructuras de informes financieros con agrupamientos dinámicos.

## Características

- Creación de formatos con estructura de árbol
- Agrupamiento dinámico de n niveles
- Soporte para cuentas contables y grupos
- Drag & drop para reorganizar la estructura
- Exportación a Excel
- Interfaz moderna y responsive

## Requisitos

- Node.js 18 o superior
- npm o yarn

## Instalación

1. Clona el repositorio:
```bash
git clone <url-del-repositorio>
cd financial-report-builder
```

2. Instala las dependencias:
```bash
npm install
# o
yarn
```

## Desarrollo

Para ejecutar la aplicación en modo desarrollo:

```bash
npm run dev
# o
yarn dev
```

## Construcción

Para construir la aplicación para producción:

```bash
npm run build
# o
yarn build
```

## Uso

1. **Crear un nuevo formato**
   - Haz clic en el botón "Nuevo" en la barra lateral
   - Ingresa un nombre para el formato

2. **Agregar elementos**
   - Usa los botones "+" para agregar grupos o cuentas
   - Los grupos pueden contener otros grupos o cuentas
   - Las cuentas son nodos terminales

3. **Organizar la estructura**
   - Arrastra y suelta los elementos para reorganizarlos
   - Usa el ícono de arrastre (⋮) para mover elementos
   - Expande/colapsa grupos usando las flechas

4. **Editar elementos**
   - Haz clic en el nombre de un elemento para editarlo
   - Usa el botón "×" para eliminar elementos

5. **Exportar**
   - Usa el botón "Exportar a Excel" para generar un archivo .xlsx
   - El archivo incluirá la estructura completa y los montos

## Licencia

MIT 