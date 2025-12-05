import React from 'react';
import { EducationalStage, LiteraryGenre } from '../types';
import { STAGE_COLORS, GENRE_COLORS } from '../constants';

interface SpineLabelProps {
  stage: EducationalStage;
  genre: LiteraryGenre;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SpineLabel: React.FC<SpineLabelProps> = ({ stage, genre, className = "", size = 'md' }) => {
  // Defensive coding: Ensure we always have a valid color object, even if data is corrupt
  const defaultStageColor = STAGE_COLORS[EducationalStage.REFERENCIA];
  const stageColor = STAGE_COLORS[stage] || defaultStageColor || { 
    bg: 'bg-gray-400', 
    text: 'text-white', 
    hex: '#9CA3AF',
    label: 'Desconocido' 
  };
  
  const defaultGenreColor = GENRE_COLORS[LiteraryGenre.INFORMATIVO];
  const genreColor = GENRE_COLORS[genre] || defaultGenreColor || { 
    bg: 'bg-white', 
    border: 'border-gray-300', 
    hex: '#FFFFFF', 
    label: 'Desconocido' 
  };

  const sizeClasses = {
    sm: 'w-8 h-12',
    md: 'w-12 h-16',
    lg: 'w-24 h-32'
  };

  const dotSizes = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-10 h-10'
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div 
        className={`${sizeClasses[size]} ${stageColor.bg} relative rounded-sm shadow-sm flex items-end justify-center pb-2 ${className} border border-gray-200`}
        title={`Etapa: ${stageColor.label}`}
      >
        <div 
          className={`${dotSizes[size]} rounded-full ${genreColor.bg} ${genreColor.border} border-2 shadow-sm`}
          title={`Género: ${genreColor.label}`}
        />
      </div>
      {size !== 'sm' && (
        <span className="text-[10px] text-gray-500 font-mono text-center leading-tight">
          {stageColor.label} <br/> + {genreColor.label}
        </span>
      )}
    </div>
  );
};