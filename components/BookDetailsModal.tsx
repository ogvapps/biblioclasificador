
import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, BookOpen, Star, Pencil, Save, XCircle, Loader2 } from 'lucide-react';
import { Book, EducationalStage, LiteraryGenre, BookCondition } from '../types';
import { SpineLabel } from './SpineLabel';
import { cancelReservation, updateBook } from '../services/storageService';
import { LIBRARY_SETTINGS } from '../constants';

interface BookDetailsModalProps {
  isOpen: boolean;
  book: Book | null;
  onClose: () => void;
  canEdit?: boolean; // Only shown for ADMIN/ASSISTANT
}

export const BookDetailsModal: React.FC<BookDetailsModalProps> = ({ isOpen, book, onClose, canEdit = false }) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Editable fields
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editAge, setEditAge] = useState(0);
  const [editStage, setEditStage] = useState<EducationalStage>(EducationalStage.PRIMARIA_MEDIO);
  const [editGenre, setEditGenre] = useState<LiteraryGenre>(LiteraryGenre.NOVELA);
  const [editSynopsis, setEditSynopsis] = useState('');
  const [editColumn, setEditColumn] = useState(0);
  const [editShelf, setEditShelf] = useState(0);
  const [editCondition, setEditCondition] = useState<BookCondition | undefined>(undefined);

  const columns = Array.from({ length: LIBRARY_SETTINGS.TOTAL_COLUMNS }, (_, i) => i + 1);
  const shelves = Array.from({ length: LIBRARY_SETTINGS.SHELVES_PER_COLUMN }, (_, i) => i + 1);

  useEffect(() => {
    if (book) {
      setEditTitle(book.title);
      setEditAuthor(book.author);
      setEditAge(book.age || 0);
      setEditStage(book.stage);
      setEditGenre(book.genre);
      setEditSynopsis(book.synopsis || '');
      setEditColumn(book.column || 0);
      setEditShelf(book.shelf || 0);
      setEditCondition(book.condition);
    }
    setIsEditing(false);
  }, [book]);

  if (!isOpen || !book) return null;

  const handleCancelReservation = async () => {
    setIsCancelling(true);
    try {
      await cancelReservation(book.id);
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error al cancelar la reserva.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editAuthor.trim()) {
      alert('El título y el autor son obligatorios.');
      return;
    }
    setIsSaving(true);
    try {
      const updatedBook: Book = {
        ...book,
        title: editTitle.trim(),
        author: editAuthor.trim(),
        age: editAge,
        stage: editStage,
        genre: editGenre,
        synopsis: editSynopsis.trim(),
        column: editColumn || book.column,
        shelf: editShelf || book.shelf,
        condition: editCondition,
      };
      await updateBook(updatedBook);
      setIsEditing(false);
      // Reflect changes locally without closing
      // The subscription in App.tsx will push the update reactively
    } catch (error) {
      console.error(error);
      alert('Error al guardar los cambios.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardEdit = () => {
    // Reset to original values
    setEditTitle(book.title);
    setEditAuthor(book.author);
    setEditAge(book.age || 0);
    setEditStage(book.stage);
    setEditGenre(book.genre);
    setEditSynopsis(book.synopsis || '');
    setEditColumn(book.column || 0);
    setEditShelf(book.shelf || 0);
    setIsEditing(false);
  };

  const inputClass = 'w-full rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 px-3 py-2 text-sm outline-none bg-white';
  const labelClass = 'block text-[10px] font-bold text-slate-400 uppercase mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white h-full w-full sm:h-auto sm:rounded-2xl shadow-2xl sm:max-w-2xl overflow-hidden flex flex-col max-h-[100dvh] sm:max-h-[90vh] relative animate-in slide-in-from-bottom-4 duration-300 sm:zoom-in-95">

        {/* Top action bar */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {canEdit && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-full text-xs font-bold shadow border border-slate-200 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </button>
          )}
          {isEditing && (
            <>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-bold shadow transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Guardar
              </button>
              <button
                onClick={handleDiscardEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 text-slate-600 rounded-full text-xs font-bold shadow border border-slate-200 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancelar
              </button>
            </>
          )}
          {!isEditing && (
            <button
              onClick={onClose}
              className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-sm"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

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
            {/* ── EDIT MODE ─────────────────────────────────────── */}
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Título</label>
                  <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className={inputClass} placeholder="Título del libro" />
                </div>
                <div>
                  <label className={labelClass}>Autor</label>
                  <input value={editAuthor} onChange={e => setEditAuthor(e.target.value)} className={inputClass} placeholder="Autor" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Etapa Educativa</label>
                    <select value={editStage} onChange={e => setEditStage(e.target.value as EducationalStage)} className={inputClass}>
                      {Object.values(EducationalStage).map(s => (
                        <option key={s} value={s}>{s.split('(')[0].trim()}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Género</label>
                    <select value={editGenre} onChange={e => setEditGenre(e.target.value as LiteraryGenre)} className={inputClass}>
                      {Object.values(LiteraryGenre).map(g => (
                        <option key={g} value={g}>{g.split('(')[0].trim()}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Edad recom.</label>
                    <input type="number" min={0} max={20} value={editAge} onChange={e => setEditAge(parseInt(e.target.value) || 0)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Columna</label>
                    <select value={editColumn} onChange={e => setEditColumn(parseInt(e.target.value))} className={inputClass}>
                      <option value={0}>—</option>
                      {columns.map(c => <option key={c} value={c}>C{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Balda</label>
                    <select value={editShelf} onChange={e => setEditShelf(parseInt(e.target.value))} className={inputClass}>
                      <option value={0}>—</option>
                      {shelves.map(s => <option key={s} value={s}>B{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Estado físico</label>
                  <select value={editCondition || ''} onChange={e => setEditCondition(e.target.value as BookCondition || undefined)} className={inputClass}>
                    <option value="">Sin especificar</option>
                    {Object.values(BookCondition).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Sinopsis</label>
                  <textarea
                    value={editSynopsis}
                    onChange={e => setEditSynopsis(e.target.value)}
                    rows={4}
                    className={`${inputClass} resize-none`}
                    placeholder="Descripción del libro..."
                  />
                </div>
              </div>
            ) : (
              /* ── VIEW MODE ───────────────────────────────────── */
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
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} className={`w-4 h-4 ${(book.rating || 0) >= i ? 'fill-current' : (book.rating || 0) >= i - 0.5 ? 'fill-current opacity-50' : 'text-slate-200'}`} />
                        ))}
                      </div>
                      <span className="text-sm font-bold text-slate-600 ml-1">{book.rating ? book.rating.toFixed(1) : '0.0'}</span>
                      <span className="text-xs text-slate-400">({book.totalRatings || 0} votos)</span>
                    </div>
                  </div>

                  {/* Reservation Notice */}
                  {book.reservation && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-amber-800 uppercase flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Reservado
                        </p>
                        <p className="text-sm text-amber-900 mt-1">Para: <strong>{book.reservation.studentName}</strong></p>
                        <p className="text-xs text-amber-700">{new Date(book.reservation.reservedAt).toLocaleDateString()}</p>
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
                    {book.condition && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs sm:text-sm font-medium">
                        Estado: {book.condition}
                      </div>
                    )}
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
                        <BookOpen className="w-4 h-4 text-indigo-600" /> Sinopsis
                      </h3>
                      <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-sm">
                        <p className="text-slate-700 text-sm leading-6 text-justify">{book.synopsis}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Close button in edit mode (at bottom) */}
        {isEditing && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 sm:hidden">
            <button onClick={handleDiscardEdit} className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-200 rounded-lg">Cancelar</button>
            <button onClick={handleSaveEdit} disabled={isSaving} className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar cambios
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
