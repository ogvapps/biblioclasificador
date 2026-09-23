
import React, { useState, useEffect } from 'react';
import { X, Calendar, User, BookOpen, Save, GraduationCap, Users } from 'lucide-react';
import { Book, BookCondition, Student, Loan } from '../types';
import { saveLoan, subscribeToStudents, subscribeToLoans, updateBook } from '../services/storageService';
// Helper to register loan and update book status
const lendBook = async (loanData: Omit<Loan, 'id'>) => {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).substring(2, 9));
  const loan: Loan = { ...loanData, id };
  await saveLoan(loan);
  const books: Book[] = JSON.parse(localStorage.getItem('books') || '[]');
  const bookIndex = books.findIndex(b => b.id === loan.bookId);
  if (bookIndex > -1) {
    books[bookIndex].status = 'LOANED';
    books[bookIndex].currentLoanId = loan.id;
    await updateBook(books[bookIndex]);
  }
};

interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
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

export const LoanModal: React.FC<LoanModalProps> = ({ isOpen, onClose, book }) => {
  const [studentName, setStudentName] = useState('');
  const [registeredStudents, setRegisteredStudents] = useState<Student[]>([]);

  const [loans, setLoans] = useState<Loan[]>([]);

  // Split Course into Grade and Group for standardized dropdowns
  const [grade, setGrade] = useState('');
  const [group, setGroup] = useState('A');

  const maxDays = parseInt(localStorage.getItem('biblio_max_loan_days') || localStorage.getItem('biblio_max_days') || '15');

  const [loanDate, setLoanDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + maxDays);
    return d.toISOString().split('T')[0];
  });
  const [condition, setCondition] = useState<BookCondition>(BookCondition.GOOD);

  useEffect(() => {
    if (isOpen) {
      const unsubscribe = subscribeToStudents(setRegisteredStudents);
      const unsubscribeLoans = subscribeToLoans(setLoans);
      return () => {
        unsubscribe();
        unsubscribeLoans();
      };
    }
  }, [isOpen]);

  // Auto-fill course if student is selected from list
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStudentName(val);

    // Check if name matches a registered student
    const match = registeredStudents.find(s => s.name.toLowerCase() === val.toLowerCase());
    if (match) {
      // Try to parse course back to grade/group
      // Course format: "Grade Group" or just "Grade"
      const lastSpaceIndex = match.course.lastIndexOf(' ');
      if (lastSpaceIndex !== -1) {
        const potentialGroup = match.course.substring(lastSpaceIndex + 1);
        if (GROUPS.includes(potentialGroup)) {
          setGrade(match.course.substring(0, lastSpaceIndex));
          setGroup(potentialGroup);
          return;
        }
      }
      setGrade(match.course);
      setGroup('Sin Grupo');
    }
  };

  if (!isOpen || !book) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !grade) {
      alert("Por favor completa el nombre del lector y selecciona el curso.");
      return;
    }

    // Checking max books per user
    const maxBooks = parseInt(localStorage.getItem('biblio_max_books_per_user') || localStorage.getItem('biblio_max_books') || '3');
    const studentActiveLoans = loans.filter(l => l.studentName.toLowerCase() === studentName.toLowerCase() && l.status === 'ACTIVE');

    if (studentActiveLoans.length >= maxBooks) {
      alert(`Este lector ya tiene el máximo permitido de préstamos activos (${maxBooks}).`);
      return;
    }

    // Checking if student is sanctioned
    const match = registeredStudents.find(s => s.name.toLowerCase() === studentName.toLowerCase());
    if (match?.sanctionedUntil) {
      const sanctionDate = new Date(match.sanctionedUntil);
      const today = new Date();
      if (sanctionDate > today) {
        alert(`Este lector está sancionado hasta el ${sanctionDate.toLocaleDateString()} y no puede llevar libros.`);
        return;
      }
    }

    const fullCourse = group === "Sin Grupo" ? grade : `${grade} ${group}`;

    try {
      await lendBook({
        bookId: book.id,
        bookTitle: book.title,
        studentName,
        course: fullCourse,
        loanDate,
        dueDate,
        conditionOnLoan: condition,
        status: 'ACTIVE'
      });
      onClose();
      // Reset form
      setStudentName('');
      setGrade('');
      setGroup('A');
    } catch (error) {
      console.error(error);
      alert("Error al crear el préstamo.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
          <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Nuevo Préstamo
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors">
            <X className="w-5 h-5 text-indigo-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase">Libro a prestar</p>
            <p className="font-medium text-slate-800 line-clamp-1">{book.title}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Lector</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={studentName}
                  onChange={handleNameChange}
                  list="student-suggestions"
                  className="pl-9 w-full rounded-lg border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 py-2 border text-sm"
                  placeholder="Nombre y Apellidos"
                  required
                />
                <datalist id="student-suggestions">
                  {registeredStudents.map(s => (
                    <option key={s.id} value={s.name}>{s.course}</option>
                  ))}
                </datalist>
              </div>
            </div>

            <div className="col-span-2">
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha Préstamo</label>
              <div className="relative">
                <input
                  type="date"
                  value={loanDate}
                  onChange={(e) => setLoanDate(e.target.value)}
                  className="w-full rounded-lg border-slate-300 focus:ring-indigo-500 py-2 border text-sm px-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha Límite</label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border-slate-300 focus:ring-indigo-500 py-2 border text-sm px-2 font-medium text-red-600"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estado del libro (Entrega)</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as BookCondition)}
              className="w-full rounded-lg border-slate-300 focus:ring-indigo-500 py-2 border text-sm px-3 bg-white"
            >
              {Object.values(BookCondition).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 mt-4"
          >
            <Save className="w-5 h-5" />
            Registrar Préstamo
          </button>
        </form>
      </div>
    </div>
  );
};
