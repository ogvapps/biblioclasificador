import { EducationalStage, LiteraryGenre } from './types';

export const LIBRARY_SETTINGS = {
  TOTAL_COLUMNS: 12,
  SHELVES_PER_COLUMN: 9
};

// Mapping Stage to Background Color (Etiqueta Principal/Fondo)
export const STAGE_COLORS: Record<EducationalStage, { bg: string, text: string, hex: string, label: string }> = {
  [EducationalStage.INFANTIL]: { 
    bg: 'bg-red-500', 
    text: 'text-white', 
    hex: '#EF4444',
    label: 'Rojo' 
  },
  [EducationalStage.PRIMARIA_INICIAL]: { 
    bg: 'bg-blue-500', 
    text: 'text-white', 
    hex: '#3B82F6',
    label: 'Azul' 
  },
  [EducationalStage.PRIMARIA_MEDIO]: { 
    bg: 'bg-yellow-400', 
    text: 'text-black', 
    hex: '#FACC15',
    label: 'Amarillo' 
  },
  [EducationalStage.PRIMARIA_SUPERIOR]: { 
    bg: 'bg-green-500', 
    text: 'text-white', 
    hex: '#22C55E',
    label: 'Verde' 
  },
  [EducationalStage.SECUNDARIA]: { 
    bg: 'bg-purple-600', 
    text: 'text-white', 
    hex: '#9333EA',
    label: 'Morado' 
  },
  [EducationalStage.REFERENCIA]: { 
    bg: 'bg-amber-800', 
    text: 'text-white', 
    hex: '#92400E',
    label: 'Marrón' 
  },
};

// Mapping Genre to Dot Color (Pequeña Etiqueta/Punto)
export const GENRE_COLORS: Record<LiteraryGenre, { bg: string, border: string, hex: string, label: string }> = {
  [LiteraryGenre.NOVELA]: { 
    bg: 'bg-orange-500', 
    border: 'border-white', 
    hex: '#F97316',
    label: 'Naranja' 
  },
  [LiteraryGenre.FANTASIA]: { 
    bg: 'bg-blue-900', 
    border: 'border-white', 
    hex: '#1E3A8A',
    label: 'Azul Oscuro' 
  },
  [LiteraryGenre.MISTERIO]: { 
    bg: 'bg-black', 
    border: 'border-white', 
    hex: '#000000',
    label: 'Negro' 
  },
  [LiteraryGenre.POESIA]: { 
    bg: 'bg-pink-400', 
    border: 'border-white', 
    hex: '#F472B6',
    label: 'Rosa' 
  },
  [LiteraryGenre.INFORMATIVO]: { 
    bg: 'bg-white', 
    border: 'border-gray-300', 
    hex: '#FFFFFF',
    label: 'Blanco' 
  },
  [LiteraryGenre.BIOGRAFIAS]: { 
    bg: 'bg-red-600', 
    border: 'border-white', 
    hex: '#DC2626',
    label: 'Rojo' 
  },
  [LiteraryGenre.COMICS]: { 
    bg: 'bg-green-800', 
    border: 'border-white', 
    hex: '#166534',
    label: 'Verde Oscuro' 
  },
};