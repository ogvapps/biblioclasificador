
import React, { useState } from 'react';
import { X, CheckCircle, RotateCcw, Star } from 'lucide-react';
import { Loan, BookCondition } from '../types';
import { returnBookWithRef } from '../services/storageService';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({ isOpen, onClose, loan }) => {
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [condition, setCondition] = useState<BookCondition>(BookCondition.GOOD);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);

  if (!isOpen || !loan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await returnBookWithRef(loan, returnDate, condition, rating > 0 ? rating : undefined);
      onClose();
      // Reset state on close
      setRating(0);
      setHoverRating(0);
      setCondition(BookCondition.GOOD);
    } catch (error) {
      console.error(error);
      alert("Error al procesar la devolución.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-emerald-50">
          <h2 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Devolver Libro
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors">
            <X className="w-5 h-5 text-emerald-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase">Alumno</p>
            <p className="font-medium text-slate-800">{loan.studentName} ({loan.course})</p>
            <p className="text-xs font-bold text-slate-400 uppercase mt-2">Libro</p>
            <p className="font-medium text-slate-800 line-clamp-1">{loan.bookTitle}</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha Devolución</label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full rounded-lg border-slate-300 focus:ring-emerald-500 py-2 border text-sm px-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Estado del libro (Al devolver)</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as BookCondition)}
                  className="w-full rounded-lg border-slate-300 focus:ring-emerald-500 py-2 border text-sm px-3 bg-white"
                >
                  {Object.values(BookCondition).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2 text-center">Valoración del Alumno</label>
                 <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="transition-transform active:scale-95 focus:outline-none"
                      >
                         <Star 
                           className={`w-8 h-8 transition-colors ${
                             (hoverRating || rating) >= star 
                               ? 'fill-amber-400 text-amber-400' 
                               : 'text-slate-300'
                           }`} 
                         />
                      </button>
                    ))}
                 </div>
                 <p className="text-center text-xs text-slate-400 mt-1 h-4">
                    {hoverRating > 0 ? (
                        hoverRating === 1 ? 'Malo' : 
                        hoverRating === 2 ? 'Regular' :
                        hoverRating === 3 ? 'Bueno' :
                        hoverRating === 4 ? 'Muy Bueno' : 'Excelente'
                    ) : (rating > 0 ? 'Valorado' : 'Sin valorar')}
                 </p>
              </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 mt-4"
          >
            <CheckCircle className="w-5 h-5" />
            Confirmar Devolución
          </button>
        </form>
      </div>
    </div>
  );
};
