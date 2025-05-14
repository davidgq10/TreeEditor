import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Palette } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

// Define los temas disponibles con sus nombres y colores primarios
export const themes = [
  { id: 'red', name: 'Rojo', primaryColor: '#E55050' },
  { id: 'crimson', name: 'Carmesí', primaryColor: '#B03052' },
  { id: 'navy', name: 'Azul Marino', primaryColor: '#23486A' },
  { id: 'teal', name: 'Verde Azulado', primaryColor: '#43766C' },
  { id: 'brown', name: 'Marrón', primaryColor: '#8D7B68' },
  { id: 'default', name: 'Por defecto', primaryColor: '#1E40AF' },
];

// Almacenes para los temas y las funciones necesarias para interactuar con él
const THEME_STORAGE_KEY = 'app-selected-theme';

interface ThemeSelectorProps {
  className?: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ className }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>('default');

  // Cargar tema guardado al iniciar
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await window.electronAPI?.store.get(THEME_STORAGE_KEY);
        
        if (storedTheme) {
          setSelectedTheme(storedTheme);
          applyTheme(storedTheme);
        } else {
          setSelectedTheme('default');
        }
      } catch (error) {
        console.error('Error al cargar el tema:', error);
        setSelectedTheme('default');
      }
    };
    
    loadTheme();
  }, []);

  // Aplica el tema seleccionado al documento
  const applyTheme = (themeId: string) => {
    const theme = themes.find(t => t.id === themeId);
    if (!theme) return;
    
    document.documentElement.style.setProperty('--theme-primary', theme.primaryColor);
    
    // Calcular colores derivados (versiones más claras y oscuras del color primario)
    const r = parseInt(theme.primaryColor.slice(1, 3), 16);
    const g = parseInt(theme.primaryColor.slice(3, 5), 16);
    const b = parseInt(theme.primaryColor.slice(5, 7), 16);
    
    // Añadir valores RGB para poder usar transparencias
    document.documentElement.style.setProperty('--theme-primary-rgb', `${r}, ${g}, ${b}`);
    
    // Color primario más claro (para hover)
    const lighterColor = `rgba(${r}, ${g}, ${b}, 0.1)`;
    document.documentElement.style.setProperty('--theme-primary-lighter', lighterColor);
    
    // Color primario más oscuro (para active/pressed)
    const darkerR = Math.max(0, r - 30);
    const darkerG = Math.max(0, g - 30);
    const darkerB = Math.max(0, b - 30);
    const darkerColor = `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`;
    document.documentElement.style.setProperty('--theme-primary-darker', darkerColor);
    
    // Guardar la selección
    window.electronAPI?.store.set(THEME_STORAGE_KEY, themeId);
  };

  const handleThemeSelect = (themeId: string) => {
    setSelectedTheme(themeId);
    applyTheme(themeId);
    setIsDialogOpen(false);
  };

  // Encuentra el tema actual para mostrar en el botón
  const currentTheme = themes.find(t => t.id === selectedTheme) || themes[0];

  return (
    <>
      <Button 
        variant="outline" 
        className={`flex items-center gap-2 ${className}`} 
        onClick={() => setIsDialogOpen(true)}
        style={{ borderColor: currentTheme.primaryColor, color: currentTheme.primaryColor }}
      >
        <Palette className="w-4 h-4" style={{ color: currentTheme.primaryColor }} />
        <span>{currentTheme.name}</span>
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Seleccionar Tema</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {themes.map((theme) => (
              <div
                key={theme.id}
                className={`
                  p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${selectedTheme === theme.id ? 'ring-2 ring-offset-2' : 'hover:bg-gray-50'}
                `}
                style={{ 
                  borderColor: theme.primaryColor,
                  color: theme.primaryColor,
                  ...(selectedTheme === theme.id ? { ringColor: theme.primaryColor } : {})
                }}
                onClick={() => handleThemeSelect(theme.id)}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 rounded-full" 
                    style={{ backgroundColor: theme.primaryColor }} 
                  />
                  <span className="font-medium">{theme.name}</span>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
