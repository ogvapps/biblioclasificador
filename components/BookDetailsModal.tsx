
import React, { useState } from 'react';
import { X, Calendar, MapPin, BookOpen, Star, AlertCircle } from 'lucide-react';
import { Book } from '../types';
import { SpineLabel } from './SpineLabel';
import { cancelReservation } from '../services/storageService';

interface BookDetailsModalProps {
  isOpen: boolean;
  book: Book | null;
  onClose: () => void;
}

export const BookDetailsModal: React.FC<BookDetailsModalProps> = ({ isOpen, book, onClose }) => {
  const [isCancelling, setIsCancelling] = useState(false);

  if (!isOpen || !book) return null;

  const handleCancelReservation = async () => {
      setIsCancelling(true);
      try {
          await cancelReservation(book.id);
          onClose(); // Close to refresh state visually or rely on subscription, but closing is safer
      } catch (error) {
          console.error(error);
          alert("Error al cancelar la reserva.");
      } finally {
          setIsCancelling(false);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white h-full w-full sm:h-auto sm:rounded-2xl shadow-2xl sm:max-w-2xl overflow-hidden flex flex-col max-h-[100dvh] sm:max-h-[90vh] relative animate-in slide-in-from-bottom-4 duration-300 sm:zoom-in-95">
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-sm"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto custom-scrollbar flex-1">
          {/* Header Image Area */}
          <div className="h-48 sm:h-64 bg-slate-900 relative flex items-center justify-center overflow-hidden shrink-0">
             {book.coverImage ? (
                <>
                  <img src={book.coverImage} className="absolute inset-0 w-full h-full object-cover opacity-50 blur-xl scale-110" alt="" />
                  <img src={book.coverImage} className="relative h-full object-contain shadow-2xl z-10 py-4" alt={book.title} />
                </>
             ) : (
                <div className="text-slate-500 flex flex-col items-center">
                   <BookOpen className="w-16 h-16 opacity-30" />
                   <span className="text-sm mt-2 font-medium opacity-50">Sin portada</span>
                </div>
             )}
          </div>

          <div className="p-5 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-6">
               <div className="flex-shrink-0 mx-auto sm:mx-0">
                  <SpineLabel stage={book.stage} genre={book.genre} size="lg" />
               </div>
               
               <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight mb-1">{book.title}</h2>
                    <p className="text-base sm:text-lg text-slate-600 font-medium">{book.author}</p>
                    
                    {/* Rating Badge */}
                    <div className="flex items-center gap-1 mt-2">
                       <div className="flex text-amber-400">
                          {[1,2,3,4,5].map(i => (
                             <Star key={i} className={`w-4 h-4 ${(book.rating || 0) >= i ? 'fill-current' : (book.rating || 0) >= i - 0.5 ? 'fill-current opacity-50' : 'text-slate-200'}`} />
                          ))}
                       </div>
                       <span className="text-sm font-bold text-slate-600 ml-1">
                          {book.rating ? book.rating.toFixed(1) : '0.0'}
                       </span>
                       <span className="text-xs text-slate-400">
                          ({book.totalRatings || 0} votos)
                       </span>
                    </div>
                  </div>

                  {/* Reservation Notice */}
                  {book.reservation && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex justify-between items-center">
                          <div>
                              <p className="text-xs font-bold text-amber-800 uppercase flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  Reservado
                              </p>
                              <p className="text-sm text-amber-900 mt-1">
                                  Para: <strong>{book.reservation.studentName}</strong>
                              </p>
                              <p className="text-xs text-amber-700">
                                  {new Date(book.reservation.reservedAt).toLocaleDateString()}
                              </p>
                          </div>
                          <button 
                             onClick={handleCancelReservation}
                             disabled={isCancelling}
                             className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline px-2 py-1"
                          >
                             Cancelar
                          </button>
                      </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                     <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 rounded-lg text-xs sm:text-sm font-bold border border-amber-100">
                        <MapPin className="w-3.5 h-3.5" />
                        Col C{book.column} | Balda {book.shelf}
                     </div>
                     <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs sm:text-sm font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(book.addedAt).toLocaleDateString()}
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                     <div>
                        <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase mb-1">Etapa</p>
                        <p className="text-xs sm:text-sm font-semibold text-slate-700">{book.stage?.split('(')[0]}</p>
                     </div>
                     <div>
                        <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase mb-1">Género</p>
                        <p className="text-xs sm:text-sm font-semibold text-slate-700">{book.genre?.split('(')[0]}</p>
                     </div>
                     <div>
                        <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase mb-1">Edad</p>
                        <p className="text-xs sm:text-sm font-semibold text-slate-700">+{book.age} años</p>
                     </div>
                     <div>
                        <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase mb-1">Estado</p>
                        {book.currentLoanId ? (
                             <span className="text-orange-600 font-bold text-xs sm:text-sm">Prestado</span>
                        ) : (
                             <span className="text-green-600 font-bold text-xs sm:text-sm">Disponible</span>
                        )}
                     </div>
                  </div>

                  {book.synopsis && (
                    <div className="mt-6 pt-6 border-t border-slate-100 pb-8">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                        Sinopsis
                      </h3>
                      <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-sm">
                        <p className="text-slate-700 text-sm leading-6 text-justify">
                            {book.synopsis}
                        </p>
                      </div>
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
