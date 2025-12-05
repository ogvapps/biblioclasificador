
import React, { useMemo } from 'react';
import { Book, Loan, Student, EducationalStage } from '../types';
import { STAGE_COLORS } from '../constants';
import { TopBooksView } from './TopBooksView';
import { 
  Library, 
  History, 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  BookOpen, 
  Clock, 
  Award,
  ArrowRight
} from 'lucide-react';

interface DashboardViewProps {
  books: Book[];
  loans: Loan[];
  students: any[]; // Relaxed type to accept enriched student objects
  onNavigateTo: (tab: 'inventory' | 'loans' | 'students') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ books, loans, students, onNavigateTo }) => {
  
  // --- Statistics Calculation ---
  const stats = useMemo(() => {
    const totalBooks = books.length;
    const activeLoans = loans.filter(l => l.status === 'ACTIVE');
    const totalLoans = activeLoans.length;
    
    // Calculate Overdue
    const now = new Date();
    // Reset time to start of day for fair comparison
    now.setHours(0, 0, 0, 0);
    
    const overdueLoans = activeLoans.filter(l => {
      const due = new Date(l.dueDate);
      return due < now;
    });

    // Unique students who have ever borrowed a book
    const activeReadersCount = new Set(loans.map(l => l.studentName.toLowerCase())).size;

    return { totalBooks, totalLoans, overdueLoans, activeReadersCount };
  }, [books, loans]);

  // --- Inventory Distribution ---
  const distribution = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(EducationalStage).forEach(stage => counts[stage] = 0);
    
    books.forEach(b => {
      if (counts[b.stage] !== undefined) {
        counts[b.stage]++;
      } else {
        // Fallback for messy data
        counts[EducationalStage.REFERENCIA]++;
      }
    });

    return Object.entries(counts).map(([stage, count]) => ({
      stage: stage as EducationalStage,
      count,
      percentage: stats.totalBooks > 0 ? (count / stats.totalBooks) * 100 : 0
    })).sort((a, b) => b.count - a.count); // Sort by most populated
  }, [books, stats.totalBooks]);

  // --- Top Readers ---
  const topReaders = useMemo(() => {
    const readerCounts = new Map<string, number>();
    loans.forEach(l => {
        const name = l.studentName;
        readerCounts.set(name, (readerCounts.get(name) || 0) + 1);
    });

    return Array.from(readerCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [loans]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
            onClick={() => onNavigateTo('inventory')}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Libros</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1 group-hover:text-indigo-600 transition-colors">{stats.totalBooks}</h3>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors">
              <Library className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-medium text-slate-500">
            <span className="text-emerald-600 flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded mr-2">
              <TrendingUp className="w-3 h-3" />
              Inventario
            </span>
          </div>
        </div>

        <div 
            onClick={() => onNavigateTo('loans')}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Préstamos Activos</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1 group-hover:text-blue-600 transition-colors">{stats.totalLoans}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-medium text-slate-500">
            <span className="text-blue-600 flex items-center gap-1 bg-blue-50 px-1.5 py-0.5 rounded mr-2">
              En circulación
            </span>
          </div>
        </div>

        <div 
            onClick={() => onNavigateTo('loans')}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Retrasos / Vencidos</p>
              <h3 className={`text-2xl font-bold mt-1 transition-colors ${stats.overdueLoans.length > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                  {stats.overdueLoans.length}
              </h3>
            </div>
            <div className={`p-3 rounded-xl transition-colors ${stats.overdueLoans.length > 0 ? 'bg-red-50 group-hover:bg-red-100' : 'bg-slate-50'}`}>
              <AlertTriangle className={`w-6 h-6 ${stats.overdueLoans.length > 0 ? 'text-red-600' : 'text-slate-400'}`} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-medium text-slate-500">
             {stats.overdueLoans.length > 0 ? (
                <span className="text-red-600 font-bold">Requiere atención</span>
             ) : (
                <span className="text-emerald-600 font-bold">Todo en orden</span>
             )}
          </div>
        </div>

        <div 
            onClick={() => onNavigateTo('students')}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lectores Activos</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1 group-hover:text-emerald-600 transition-colors">{stats.activeReadersCount}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
           <div className="mt-4 flex items-center text-xs font-medium text-slate-500">
             <span className="text-slate-500">Alumnos participantes</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Inventory Distribution Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
             <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
               <TrendingUp className="w-5 h-5 text-indigo-600" />
               Distribución del Inventario
             </h3>
             
             <div className="space-y-5 flex-1">
                {distribution.map((item) => {
                    const colorData = STAGE_COLORS[item.stage];
                    return (
                        <div key={item.stage} className="relative">
                            <div className="flex justify-between text-sm mb-1.5 font-medium">
                                <span className="text-slate-700">{item.stage.split('(')[0]}</span>
                                <span className="text-slate-500">{item.count} libros ({Math.round(item.percentage)}%)</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full ${colorData?.bg || 'bg-slate-400'}`} 
                                    style={{ width: `${item.percentage}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
                {stats.totalBooks === 0 && (
                    <div className="h-full flex items-center justify-center">
                       <p className="text-center text-slate-400 text-sm">Aún no hay libros registrados.</p>
                    </div>
                )}
             </div>
          </div>

          {/* Right Column: Alerts, Readers & Books */}
          <div className="space-y-6">
             
             {/* Overdue Alerts */}
             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-red-500" />
                    Devoluciones Pendientes
                </h3>
                
                {stats.overdueLoans.length === 0 ? (
                    <div className="bg-emerald-50 rounded-xl p-4 text-emerald-800 text-sm font-medium border border-emerald-100 flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        ¡Genial! No hay libros con retraso.
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {stats.overdueLoans.map(loan => (
                             <div key={loan.id} className="p-3 bg-red-50 border border-red-100 rounded-xl">
                                 <p className="font-bold text-red-900 text-sm line-clamp-1">{loan.bookTitle}</p>
                                 <div className="flex justify-between items-end mt-1">
                                    <p className="text-xs text-red-700">{loan.studentName}</p>
                                    <p className="text-xs font-bold text-red-600 bg-white px-2 py-0.5 rounded border border-red-200">
                                        {new Date(loan.dueDate).toLocaleDateString()}
                                    </p>
                                 </div>
                             </div>
                        ))}
                    </div>
                )}
             </div>

             {/* Top Books */}
             <TopBooksView books={books} loans={loans} />

             {/* Top Readers */}
             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    Top Lectores
                </h3>
                
                {topReaders.length === 0 ? (
                    <p className="text-sm text-slate-400">Aún no hay datos de lectura.</p>
                ) : (
                    <div className="space-y-4">
                        {topReaders.map((reader, index) => (
                            <div key={reader.name} className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                    index === 0 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                    index === 1 ? 'bg-slate-200 text-slate-600 border border-slate-300' :
                                    index === 2 ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                    'bg-slate-50 text-slate-500'
                                }`}>
                                    {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-700 truncate">{reader.name}</p>
                                    <p className="text-xs text-slate-500">{reader.count} libros prestados</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
             </div>

          </div>
      </div>
    </div>
  );
};
