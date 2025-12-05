
import React, { useMemo } from 'react';
import { X, User, BookOpen, History, GraduationCap, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Loan } from '../types';

interface StudentDetailsModalProps {
  isOpen: boolean;
  studentName: string | null;
  allLoans: Loan[];
  onClose: () => void;
}

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({ isOpen, studentName, allLoans, onClose }) => {
  // Derive student data from the loan history
  const studentData = useMemo(() => {
    if (!studentName) return null;

    const studentLoans = allLoans.filter(l => l.studentName === studentName);
    // Sort by date descending
    studentLoans.sort((a, b) => new Date(b.loanDate).getTime() - new Date(a.loanDate).getTime());

    const activeLoans = studentLoans.filter(l => l.status === 'ACTIVE');
    const returnedLoans = studentLoans.filter(l => l.status === 'RETURNED');
    
    // Get the most recent course used
    const currentCourse = studentLoans.length > 0 ? studentLoans[0].course : 'Desconocido';

    return {
      loans: studentLoans,
      active: activeLoans,
      returned: returnedLoans,
      course: currentCourse,
      totalRead: returnedLoans.length
    };
  }, [studentName, allLoans]);

  if (!isOpen || !studentName || !studentData) return null;

  return (
    <div 
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose} // Close on backdrop click
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white relative overflow-hidden shrink-0">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm z-50 cursor-pointer"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center border-4 border-white/20 shadow-xl">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold leading-tight">{studentName}</h2>
              <div className="flex items-center gap-2 text-indigo-200 mt-1">
                <GraduationCap className="w-4 h-4" />
                <span className="font-medium">{studentData.course}</span>
              </div>
            </div>
          </div>

          {/* Background decoration */}
          <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
        </div>

        <div className="overflow-y-auto custom-scrollbar p-6 bg-slate-50 flex-1">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4 mb-8">
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="p-3 bg-indigo-50 rounded-lg">
                   <History className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                   <p className="text-xs font-bold text-slate-400 uppercase">Historial</p>
                   <p className="text-xl font-bold text-slate-800">{studentData.totalRead} <span className="text-sm font-normal text-slate-500">libros leídos</span></p>
                </div>
             </div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className={`p-3 rounded-lg ${studentData.active.length > 0 ? 'bg-orange-50' : 'bg-emerald-50'}`}>
                   <BookOpen className={`w-6 h-6 ${studentData.active.length > 0 ? 'text-orange-600' : 'text-emerald-600'}`} />
                </div>
                <div>
                   <p className="text-xs font-bold text-slate-400 uppercase">Estado Actual</p>
                   <p className="text-xl font-bold text-slate-800">
                     {studentData.active.length > 0 
                       ? `${studentData.active.length} pendientes` 
                       : 'Sin libros'
                     }
                   </p>
                </div>
             </div>
          </div>

          {/* Active Loans Section */}
          {studentData.active.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                En su poder (No devueltos)
              </h3>
              <div className="space-y-3">
                {studentData.active.map(loan => (
                  <div key={loan.id} className="bg-white border-l-4 border-orange-400 p-4 rounded-r-xl shadow-sm">
                    <div className="flex justify-between items-start">
                       <div>
                          <h4 className="font-bold text-slate-800 text-lg mb-1">{loan.bookTitle}</h4>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Calendar className="w-3 h-3" />
                            <span>Prestado el: {new Date(loan.loanDate).toLocaleDateString()}</span>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Fecha Límite</p>
                          <p className={`font-bold ${new Date(loan.dueDate) < new Date() ? 'text-red-600' : 'text-slate-700'}`}>
                            {new Date(loan.dueDate).toLocaleDateString()}
                          </p>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History Section */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
              Historial de Lectura
            </h3>
            
            {studentData.returned.length === 0 ? (
               <div className="text-center py-8 text-slate-400 bg-white rounded-xl border border-slate-100 border-dashed">
                  No hay historial de libros devueltos.
               </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-500">Libro</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-500">Devuelto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentData.returned.map(loan => (
                      <tr key={loan.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">{loan.bookTitle}</td>
                        <td className="px-4 py-3 text-right text-slate-500">
                          {loan.returnDate ? new Date(loan.returnDate).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
