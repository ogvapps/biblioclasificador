
import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Save } from 'lucide-react';
import { Book, Student } from '../types';
import { reserveBook, subscribeToStudents } from '../services/storageService';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
}

export const ReservationModal: React.FC<ReservationModalProps> = ({ isOpen, onClose, book }) => {
  const [studentName, setStudentName] = useState('');
  const [registeredStudents, setRegisteredStudents] = useState<Student[]>([]);

  useEffect(() => {
    if (isOpen) {
      const unsubscribe = subscribeToStudents(setRegisteredStudents);
      return () => unsubscribe();
    }
  }, [isOpen]);

  if (!isOpen || !book) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName) {
      alert("Por favor indica el nombre del alumno.");
      return;
    }

    try {
      await reserveBook(book.id, studentName);
      onClose();
      setStudentName('');
    } catch (error) {
      console.error(error);
      alert("Error al crear la reserva.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-amber-50">
          <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Reservar Libro
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors">
            <X className="w-5 h-5 text-amber-800" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase">Libro no disponible</p>
            <p className="font-medium text-slate-800 line-clamp-1">{book.title}</p>
            <p className="text-xs text-slate-500 mt-1">Este libro está prestado actualmente. Al reservarlo, aparecerá marcado para el siguiente alumno.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reservar para:</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                list="student-suggestions-reserve"
                className="pl-9 w-full rounded-lg border-slate-300 focus:ring-amber-500 focus:border-amber-500 py-2 border text-sm"
                placeholder="Nombre del Alumno"
                required
                autoFocus
              />
              <datalist id="student-suggestions-reserve">
                 {registeredStudents.map(s => (
                   <option key={s.id} value={s.name}>{s.course}</option>
                 ))}
              </datalist>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 mt-4 shadow-md shadow-amber-200"
          >
            <Save className="w-5 h-5" />
            Confirmar Reserva
          </button>
        </form>
      </div>
    </div>
  );
};
