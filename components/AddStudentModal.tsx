
import React, { useState } from 'react';
import { X, User, GraduationCap, Users, Save } from 'lucide-react';
import { addStudent } from '../services/storageService';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GRADES = [
  "Infantil 3 años", "Infantil 4 años", "Infantil 5 años",
  "1º Primaria", "2º Primaria", "3º Primaria", "4º Primaria", "5º Primaria", "6º Primaria",
  "1º ESO", "2º ESO", "3º ESO", "4º ESO",
  "1º Bachillerato", "2º Bachillerato",
  "FP Básica", "Ciclo Formativo",
  "Profesores/Personal"
];

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "Sin Grupo"];

export const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [group, setGroup] = useState('A');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !grade) {
      alert("Por favor completa el nombre y selecciona el curso.");
      return;
    }

    const fullCourse = group === "Sin Grupo" ? grade : `${grade} ${group}`;

    try {
      await addStudent({
        name,
        course: fullCourse,
        registeredAt: new Date().toISOString()
      });
      onClose();
      // Reset
      setName('');
      setGrade('');
      setGroup('A');
    } catch (error) {
      console.error(error);
      alert("Error al guardar alumno.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
          <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
            <User className="w-5 h-5" />
            Nuevo Alumno
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors">
            <X className="w-5 h-5 text-indigo-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Alumno</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9 w-full rounded-lg border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 py-2 border text-sm"
                placeholder="Nombre y Apellidos"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Curso / Clase</label>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 relative">
                <GraduationCap className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="pl-9 w-full rounded-lg border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 py-2 border text-sm bg-white appearance-none"
                  required
                >
                  <option value="" disabled>Nivel...</option>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="col-span-1 relative">
                <Users className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="pl-8 w-full rounded-lg border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 py-2 border text-sm bg-white appearance-none"
                >
                   {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 mt-4"
          >
            <Save className="w-5 h-5" />
            Guardar Alumno
          </button>
        </form>
      </div>
    </div>
  );
};
