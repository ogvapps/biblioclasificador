
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Book, Loan, EducationalStage, Student, UserRole, LiteraryGenre } from './types';
import { Plus, Download, Upload, BookOpen, Search, Library, MapPin, Settings, CheckCircle2, Trash2, Users, Hand, History, RotateCcw, CloudUpload, GraduationCap, LayoutDashboard, Lock, Unlock, FileSpreadsheet, Filter, ArrowUpDown, ArrowUp, ArrowDown, XCircle, User, UserPlus, Cloud, CloudOff, Menu, ChevronDown, ChevronUp, Printer, CheckSquare, Square, Calendar, Eye, LogIn } from 'lucide-react';
import { AddBookModal } from './components/AddBookModal';
import { SettingsModal } from './components/SettingsModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { LoanModal } from './components/LoanModal';
import { ReturnModal } from './components/ReturnModal';
import { BookDetailsModal } from './components/BookDetailsModal';
import { StudentDetailsModal } from './components/StudentDetailsModal';
import { AddStudentModal } from './components/AddStudentModal';
import { DashboardView } from './components/DashboardView';
import { LoginModal } from './components/LoginModal'; 
import { SpineLabel } from './components/SpineLabel';
import { PrintLabelsModal } from './components/PrintLabelsModal';
import { ReservationModal } from './components/ReservationModal';
import { exportToExcel, importFromExcel, importStudentsFromExcel, downloadStudentTemplate } from './services/excelService';
import { subscribeToBooks, subscribeToLoans, subscribeToStudents, addBooksBatch, deleteBook, deleteStudent, addStudentsBatch, isCloudConnected } from './services/storageService';

const App: React.FC = () => {
  // Role State: Default is STUDENT (View Only)
  const [userRole, setUserRole] = useState<UserRole>('STUDENT'); 
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  const [isCloud, setIsCloud] = useState(false);

  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [registeredStudents, setRegisteredStudents] = useState<Student[]>([]);
  
  // UI State
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'inventory' | 'loans' | 'students'>('inventory');
  
  // Inventory Filters & Sort
  const [showFilters, setShowFilters] = useState(false); // Mobile toggle
  const [stageFilter, setStageFilter] = useState<'TODOS' | 'INFANTIL' | 'PRIMARIA' | 'SECUNDARIA'>('TODOS');
  const [genreFilter, setGenreFilter] = useState<string>('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'AVAILABLE' | 'LOANED'>('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Book | 'status', direction: 'asc' | 'desc' }>({ key: 'addedAt', direction: 'desc' });

  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  
  // Modal State
  const [loanModalBook, setLoanModalBook] = useState<Book | null>(null);
  const [returnModalLoan, setReturnModalLoan] = useState<Loan | null>(null);
  const [reservationModalBook, setReservationModalBook] = useState<Book | null>(null);
  const [detailsBook, setDetailsBook] = useState<Book | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  // Deletion State
  const [deleteTarget, setDeleteTarget] = useState<{id: string, title: string, type: 'book' | 'student'} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const studentFileInputRef = useRef<HTMLInputElement>(null);

  // Enforce tab restriction when role changes
  useEffect(() => {
    if (userRole === 'STUDENT') {
      setCurrentTab('inventory');
      setIsSelectionMode(false); // Disable selection mode if downgrading role
    }
  }, [userRole]);

  // Initialize Data Subscription
  useEffect(() => {
    setIsCloud(isCloudConnected());
    
    const unsubscribeBooks = subscribeToBooks(setBooks);
    const unsubscribeLoans = subscribeToLoans(setLoans);
    const unsubscribeStudents = subscribeToStudents(setRegisteredStudents);

    return () => {
      if (unsubscribeBooks) unsubscribeBooks();
      if (unsubscribeLoans) unsubscribeLoans();
      if (unsubscribeStudents) unsubscribeStudents();
    };
  }, []);

  const handleAddBooks = async (newBooksData: Omit<Book, 'id' | 'addedAt'>[]) => {
    const booksWithDates = newBooksData.map(b => ({
      ...b,
      addedAt: new Date().toISOString()
    }));

    try {
      await addBooksBatch(booksWithDates);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (error) {
      console.error("Error saving books:", error);
      alert("Hubo un error al guardar los libros.");
    }
  };

  const handleRequestDelete = (e: React.MouseEvent, id: string, title: string, type: 'book' | 'student' = 'book') => {
    e.stopPropagation(); 
    setDeleteTarget({ id, title, type });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'book') {
        await deleteBook(deleteTarget.id);
        if (selectedBookIds.has(deleteTarget.id)) {
          const newSet = new Set(selectedBookIds);
          newSet.delete(deleteTarget.id);
          setSelectedBookIds(newSet);
        }
      } else {
        await deleteStudent(deleteTarget.id);
      }
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Hubo un error al intentar eliminar.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleExport = () => {
    exportToExcel(books, "Biblioteca_Export");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleStudentImportClick = () => {
    studentFileInputRef.current?.click();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedBooks = await importFromExcel(file);
      const newBooks = importedBooks.filter(impBook => {
        return !books.some(b => 
          b.title.toLowerCase() === impBook.title.toLowerCase() && 
          b.author.toLowerCase() === impBook.author.toLowerCase()
        );
      });

      if (newBooks.length > 0) {
        const booksToSave = newBooks.map(({ id, ...rest }) => rest);
        await addBooksBatch(booksToSave);
        alert(`Se han importado ${newBooks.length} libros correctamente.`);
      } else {
        alert("No se encontraron libros nuevos para importar (todos ya existían).");
      }

    } catch (error) {
      console.error(error);
      alert("Error al importar el archivo Excel. Asegúrate de que el formato sea correcto.");
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStudentFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedStudents = await importStudentsFromExcel(file);
      
      // Filter existing
      const newStudents = importedStudents.filter(impStu => {
         return !registeredStudents.some(s => s.name.toLowerCase() === impStu.name.toLowerCase());
      });

      if (newStudents.length > 0) {
         const studentsToSave = newStudents.map(({ id, ...rest }) => rest);
         await addStudentsBatch(studentsToSave);
         alert(`Se han importado ${newStudents.length} alumnos correctamente.`);
      } else {
        alert("No se encontraron alumnos nuevos (ya existían todos).");
      }
    } catch (error) {
      console.error(error);
      alert("Error al importar alumnos. Asegúrate de que el Excel tenga columnas 'Nombre' y 'Curso'.");
    }

    if (studentFileInputRef.current) studentFileInputRef.current.value = '';
  };

  // --- Selection Logic ---
  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      setIsSelectionMode(false);
      setSelectedBookIds(new Set());
    } else {
      setIsSelectionMode(true);
    }
  };

  const toggleBookSelection = (id: string) => {
    const newSet = new Set(selectedBookIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedBookIds(newSet);
  };

  const selectAllFiltered = () => {
     if (selectedBookIds.size === filteredBooks.length) {
       setSelectedBookIds(new Set());
     } else {
       const newSet = new Set<string>();
       filteredBooks.forEach(b => newSet.add(b.id));
       setSelectedBookIds(newSet);
     }
  };

  const getSelectedBooksList = () => {
    return books.filter(b => selectedBookIds.has(b.id));
  };


  // --- Filter Logic ---

  const handleSort = (key: keyof Book | 'status') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredBooks = useMemo(() => {
    let result = books.filter(b => {
      // 1. Search Term
      const matchesSearch = 
        b.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.author?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 2. Stage Filter
      let matchesStage = true;
      if (stageFilter === 'INFANTIL') {
        matchesStage = b.stage === EducationalStage.INFANTIL;
      } else if (stageFilter === 'PRIMARIA') {
        matchesStage = [
          EducationalStage.PRIMARIA_INICIAL,
          EducationalStage.PRIMARIA_MEDIO,
          EducationalStage.PRIMARIA_SUPERIOR
        ].includes(b.stage);
      } else if (stageFilter === 'SECUNDARIA') {
        matchesStage = b.stage === EducationalStage.SECUNDARIA;
      }

      // 3. Genre Filter
      let matchesGenre = true;
      if (genreFilter !== 'ALL') {
        matchesGenre = b.genre === genreFilter;
      }

      // 4. Availability Filter
      let matchesAvailability = true;
      if (availabilityFilter === 'AVAILABLE') {
        matchesAvailability = !b.currentLoanId;
      } else if (availabilityFilter === 'LOANED') {
        matchesAvailability = !!b.currentLoanId;
      }

      return matchesSearch && matchesStage && matchesGenre && matchesAvailability;
    });

    // 5. Sorting
    return result.sort((a, b) => {
      let valA: any = a[sortConfig.key as keyof Book];
      let valB: any = b[sortConfig.key as keyof Book];

      // Handle custom sort keys
      if (sortConfig.key === 'status') {
        valA = a.currentLoanId ? 1 : 0;
        valB = b.currentLoanId ? 1 : 0;
      }

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [books, searchTerm, stageFilter, genreFilter, availabilityFilter, sortConfig]);

  const filteredLoans = loans.filter(l => 
    l.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.bookTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allStudents = useMemo(() => {
    const studentMap = new Map<string, { id?: string, name: string, course: string, active: number, total: number, registered: boolean }>();
    registeredStudents.forEach(s => {
      studentMap.set(s.name.toLowerCase(), {
        id: s.id,
        name: s.name,
        course: s.course,
        active: 0,
        total: 0,
        registered: true
      });
    });
    loans.forEach(loan => {
      const key = loan.studentName.toLowerCase();
      if (!studentMap.has(key)) {
        studentMap.set(key, {
          name: loan.studentName,
          course: loan.course,
          active: 0,
          total: 0,
          registered: false
        });
      }
      const stats = studentMap.get(key)!;
      stats.total += 1;
      if (loan.status === 'ACTIVE') stats.active += 1;
    });
    return Array.from(studentMap.values());
  }, [loans, registeredStudents]);

  const filteredStudents = allStudents.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.course.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative pb-safe">
      
      {showSuccessToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300 w-[90%] max-w-sm">
           <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm">
             <div className="bg-white/20 p-1 rounded-full shrink-0">
               <CheckCircle2 className="w-4 h-4" />
             </div>
             <span className="font-bold">Libros guardados correctamente</span>
           </div>
        </div>
      )}

      {/* Header - Optimized for Mobile */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg bg-slate-700`}>
              <Library className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl md:text-2xl font-bold text-slate-800 tracking-tight flex items-baseline gap-1 leading-none">
                <span>Biblio</span><span className="text-slate-500 hidden sm:inline">Clasificador</span>
              </h1>
            </div>
            
            {/* Cloud Status Indicator - Compact on Mobile */}
            <div 
              className={`flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold border ml-1 ${isCloud ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
              title={isCloud ? "Conectado a la Nube" : "Modo Local (Offline)"}
            >
              {isCloud ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
              <span className="hidden sm:inline">{isCloud ? "ONLINE" : "OFFLINE"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            
            {/* Role Switcher - Updated for new roles */}
            <div className="mr-1 sm:mr-2">
              {userRole === 'STUDENT' ? (
                <button 
                  onClick={() => setIsLoginModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors text-xs font-bold border border-slate-200"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Modo Alumno</span>
                  <LogIn className="w-3.5 h-3.5 ml-1 opacity-50" />
                </button>
              ) : (
                 <div className="flex items-center gap-1">
                   <button 
                    onClick={() => setUserRole('STUDENT')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full hover:bg-indigo-100 transition-colors text-xs font-bold"
                    title="Cerrar Sesión (Volver a Modo Alumno)"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{userRole === 'ADMIN' ? 'Admin' : 'Ayudante'}</span>
                  </button>
                 </div>
              )}
            </div>

            {/* Desktop Actions / Mobile Hidden or Icon Only */}
            {userRole === 'ADMIN' && (
              <>
                 <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
                    <Settings className="w-5 h-5" />
                 </button>
                 <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx, .xls" className="hidden" />
                 <button onClick={handleImportClick} className="hidden sm:flex p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg">
                    <Upload className="w-5 h-5" />
                 </button>
              </>
            )}

            {/* Export */}
            {userRole !== 'STUDENT' && (
             <button onClick={handleExport} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg">
                <Download className="w-5 h-5" />
             </button>
            )}

            {/* Add Book FAB-style in Header on Mobile */}
            {userRole === 'ADMIN' && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all font-medium text-sm ml-1"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline ml-2">Nuevo</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 overflow-x-hidden">
        
        {/* Navigation Tabs - Hidden for STUDENT role */}
        {userRole !== 'STUDENT' && (
          <div className="flex gap-4 mb-6 border-b border-slate-200 overflow-x-auto no-scrollbar mask-gradient-right">
             <button onClick={() => setCurrentTab('dashboard')} className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${currentTab === 'dashboard' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>
               <LayoutDashboard className="w-4 h-4" /> DASHBOARD
             </button>
             <button onClick={() => setCurrentTab('inventory')} className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${currentTab === 'inventory' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>
               <BookOpen className="w-4 h-4" /> INVENTARIO
             </button>
             <button onClick={() => setCurrentTab('students')} className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${currentTab === 'students' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>
               <GraduationCap className="w-4 h-4" /> ALUMNOS
             </button>
             <button onClick={() => setCurrentTab('loans')} className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${currentTab === 'loans' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>
               <History className="w-4 h-4" /> PRÉSTAMOS
             </button>
          </div>
        )}
        
        {/* Simplified Title for STUDENT view */}
        {userRole === 'STUDENT' && (
           <div className="mb-6">
             <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-indigo-600" />
                Catálogo de Libros
             </h2>
             <p className="text-slate-500 text-sm mt-1">Busca libros, consulta su disponibilidad y ubicación.</p>
           </div>
        )}

        {/* --- DASHBOARD VIEW --- */}
        {currentTab === 'dashboard' && userRole !== 'STUDENT' && (
           <DashboardView books={books} loans={loans} students={allStudents} onNavigateTo={(tab) => setCurrentTab(tab)} />
        )}

        {/* --- INVENTORY VIEW --- */}
        {currentTab === 'inventory' && (
          <div className="animate-in fade-in duration-300">
            {/* Mobile Optimized Toolbar */}
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm mb-4 sm:mb-6 space-y-3 sm:space-y-4">
               {/* Search + Filter Toggle + Selection Mode */}
               <div className="flex gap-2">
                 <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por título o autor..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 block w-full rounded-lg border-slate-200 bg-slate-50 py-2.5 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm outline-none transition-all focus:bg-white"
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    )}
                 </div>
                 
                 {/* Selection Mode Toggle - Only for Admin/Assistant */}
                 {userRole !== 'STUDENT' && (
                   <button 
                     onClick={toggleSelectionMode}
                     className={`p-2.5 rounded-lg border transition-colors flex items-center gap-2 text-sm font-bold ${isSelectionMode ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}
                     title="Seleccionar libros"
                   >
                     <CheckSquare className="w-5 h-5" />
                     <span className="hidden lg:inline">{isSelectionMode ? 'Cancelar' : 'Seleccionar'}</span>
                   </button>
                 )}

                 <button 
                   onClick={() => setShowFilters(!showFilters)}
                   className={`p-2.5 rounded-lg border transition-colors flex items-center gap-2 text-sm font-bold ${showFilters ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-600 border-slate-200'}`}
                 >
                   <Filter className="w-5 h-5" />
                   <span className="hidden sm:inline">Filtros</span>
                 </button>
               </div>

               {/* Batch Actions Toolbar */}
               {isSelectionMode && selectedBookIds.size > 0 && (
                 <div className="flex items-center justify-between bg-indigo-50 p-2 rounded-lg border border-indigo-100 animate-in slide-in-from-top-1">
                    <div className="flex items-center gap-2 px-2">
                       <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{selectedBookIds.size}</span>
                       <span className="text-sm font-medium text-indigo-900">seleccionados</span>
                       <button onClick={selectAllFiltered} className="text-xs text-indigo-600 font-bold underline ml-2">
                          {selectedBookIds.size === filteredBooks.length ? 'Deseleccionar' : 'Todos'}
                       </button>
                    </div>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => setIsPrintModalOpen(true)}
                         className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100"
                       >
                         <Printer className="w-4 h-4" />
                         <span className="hidden sm:inline">Imprimir Tejuelos</span>
                       </button>
                       {/* Future: Batch Delete */}
                    </div>
                 </div>
               )}

               {/* Collapsible Filters Section */}
               {(showFilters || window.innerWidth >= 1024) && (
                 <div className={`flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between border-t border-slate-100 pt-3 lg:pt-0 lg:border-0 animate-in slide-in-from-top-2`}>
                    <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-start w-full lg:w-auto">
                      {/* Stage Filter Pills */}
                      <div className="flex flex-wrap bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
                        {(['TODOS', 'INFANTIL', 'PRIMARIA', 'SECUNDARIA'] as const).map(stage => (
                          <button 
                            key={stage}
                            onClick={() => setStageFilter(stage)}
                            className={`flex-1 sm:flex-none text-center px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold transition-all ${stageFilter === stage ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            {stage === 'TODOS' ? 'Todos' : stage.charAt(0) + stage.slice(1).toLowerCase()}
                          </button>
                        ))}
                      </div>

                      {/* Dropdowns */}
                      <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                         <div className="relative">
                            <select 
                              value={genreFilter}
                              onChange={(e) => setGenreFilter(e.target.value)}
                              className="w-full pl-3 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-medium"
                            >
                              <option value="ALL">Géneros</option>
                              {Object.values(LiteraryGenre).map(g => (
                                <option key={g} value={g}>{g.split('(')[0].trim()}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-2.5 w-3 h-3 text-slate-400 pointer-events-none" />
                         </div>
                         
                         <div className="relative">
                            <select 
                              value={availabilityFilter}
                              onChange={(e) => setAvailabilityFilter(e.target.value as any)}
                              className="w-full pl-3 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-medium"
                            >
                              <option value="ALL">Estado</option>
                              <option value="AVAILABLE">Disponibles</option>
                              <option value="LOANED">Prestados</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-2.5 w-3 h-3 text-slate-400 pointer-events-none" />
                         </div>
                      </div>
                    </div>

                    {/* Results Count */}
                    <div className="text-[10px] sm:text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 whitespace-nowrap self-end sm:self-auto">
                       <span className="font-bold text-slate-900">{filteredBooks.length}</span> resultados
                    </div>
                 </div>
               )}
            </div>

            {/* Empty State */}
            {filteredBooks.length === 0 && (
               <div className="text-center py-12 sm:py-16 bg-white rounded-2xl border border-slate-200 border-dashed">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Search className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">No se encontraron libros</h3>
                  <p className="text-slate-500 text-sm mt-1">Prueba a cambiar los filtros.</p>
               </div>
            )}

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3 pb-20">
              {filteredBooks.map((book) => (
                <div 
                   key={book.id} 
                   onClick={() => isSelectionMode ? toggleBookSelection(book.id) : setDetailsBook(book)} 
                   className={`bg-white rounded-xl shadow-sm border p-3 flex gap-3 relative cursor-pointer active:scale-[0.99] transition-all ${isSelectionMode && selectedBookIds.has(book.id) ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}
                >
                  {isSelectionMode && (
                    <div className="flex items-center justify-center pr-1">
                       {selectedBookIds.has(book.id) ? <CheckSquare className="w-6 h-6 text-indigo-600" /> : <Square className="w-6 h-6 text-slate-300" />}
                    </div>
                  )}

                  <div className="flex-shrink-0 pt-1"><SpineLabel stage={book.stage} genre={book.genre} size="sm" /></div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2 mb-1">{book.title}</h3>
                    <p className="text-xs text-slate-500 truncate mb-2">{book.author}</p>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                       <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold border border-slate-200">
                         C{book.column} · B{book.shelf}
                       </span>
                       {book.currentLoanId && !book.reservation && (
                         <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold border border-orange-200">
                           {userRole === 'STUDENT' ? 'Prestado' : 'Prestado'}
                         </span>
                       )}
                       {book.reservation && (
                         <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold border border-amber-200 truncate max-w-[120px]">
                           {userRole === 'STUDENT' ? 'Reservado' : `Reserva: ${book.reservation.studentName}`}
                         </span>
                       )}
                       {!book.currentLoanId && (
                         <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold border border-emerald-200">Disponible</span>
                       )}
                    </div>
                  </div>
                  
                  {/* Quick Actions (Absolute) - Hide in selection mode OR Student mode */}
                  {!isSelectionMode && userRole !== 'STUDENT' && (
                      <div className="flex flex-col gap-2 justify-center border-l border-slate-100 pl-2 ml-1">
                          {book.currentLoanId ? (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); setReturnModalLoan(loans.find(l => l.id === book.currentLoanId) || null); }} className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 active:bg-orange-200">
                                  <RotateCcw className="w-5 h-5" />
                                </button>
                                {!book.reservation && (
                                  <button onClick={(e) => { e.stopPropagation(); setReservationModalBook(book); }} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 active:bg-amber-200">
                                    <Calendar className="w-5 h-5" />
                                  </button>
                                )}
                            </>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); setLoanModalBook(book); }} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 active:bg-indigo-200">
                              <Hand className="w-5 h-5" />
                            </button>
                          )}
                          {userRole === 'ADMIN' && (
                             <button onClick={(e) => handleRequestDelete(e, book.id, book.title)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                               <Trash2 className="w-5 h-5" />
                             </button>
                           )}
                      </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {isSelectionMode && (
                         <th className="px-3 py-4 w-10">
                           <button onClick={selectAllFiltered} title="Seleccionar todos los visibles">
                             {selectedBookIds.size > 0 && selectedBookIds.size === filteredBooks.length 
                               ? <CheckSquare className="w-5 h-5 text-indigo-600" /> 
                               : <Square className="w-5 h-5 text-slate-400" />
                             }
                           </button>
                         </th>
                      )}
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase w-20">Etiqueta</th>
                      
                      <th 
                        className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 hover:text-indigo-600 transition-colors group select-none"
                        onClick={() => handleSort('title')}
                      >
                        <div className="flex items-center gap-1">
                           Título / Autor
                           {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                           {sortConfig.key !== 'title' && <ArrowUpDown className="w-3 h-3 opacity-20 group-hover:opacity-100" />}
                        </div>
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Género</th>

                      <th 
                        className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 hover:text-indigo-600 transition-colors group select-none"
                        onClick={() => handleSort('column')}
                      >
                         <div className="flex items-center gap-1">
                           Ubicación
                           {sortConfig.key === 'column' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                           {sortConfig.key !== 'column' && <ArrowUpDown className="w-3 h-3 opacity-20 group-hover:opacity-100" />}
                        </div>
                      </th>

                      <th 
                        className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 hover:text-indigo-600 transition-colors group select-none"
                        onClick={() => handleSort('status')}
                      >
                         <div className="flex items-center gap-1">
                           Estado
                           {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                           {sortConfig.key !== 'status' && <ArrowUpDown className="w-3 h-3 opacity-20 group-hover:opacity-100" />}
                        </div>
                      </th>
                      
                      {userRole !== 'STUDENT' && (
                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Acciones</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {filteredBooks.map((book) => (
                      <tr 
                        key={book.id} 
                        onClick={() => isSelectionMode ? toggleBookSelection(book.id) : setDetailsBook(book)} 
                        className={`cursor-pointer transition-colors ${isSelectionMode && selectedBookIds.has(book.id) ? 'bg-indigo-50' : 'hover:bg-indigo-50/30'}`}
                      >
                        {isSelectionMode && (
                          <td className="px-3 py-4" onClick={(e) => { e.stopPropagation(); toggleBookSelection(book.id); }}>
                             {selectedBookIds.has(book.id) ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5 text-slate-300" />}
                          </td>
                        )}
                        <td className="px-6 py-4"><SpineLabel stage={book.stage} genre={book.genre} size="sm" /></td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-slate-900">{book.title}</div>
                          <div className="text-xs text-slate-500 font-medium">{book.author}</div>
                        </td>
                        <td className="px-6 py-4">
                            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 whitespace-nowrap">
                                {book.genre?.split('(')[0]}
                            </span>
                        </td>
                        <td className="px-6 py-4"><span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-100">C{book.column} / B{book.shelf}</span></td>
                        <td className="px-6 py-4">
                           {book.reservation ? (
                              <span className="inline-flex items-center gap-1.5 text-xs bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full border border-amber-100 font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Reservado
                              </span>
                           ) : book.currentLoanId ? (
                              <span className="inline-flex items-center gap-1.5 text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full border border-orange-100 font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Prestado
                              </span>
                           ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100 font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Disponible
                              </span>
                           )}
                        </td>
                        {userRole !== 'STUDENT' && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {book.currentLoanId ? (
                              <>
                                <button 
                                  onClick={() => setReturnModalLoan(loans.find(l => l.id === book.currentLoanId) || null)} 
                                  className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs font-bold rounded-lg transition-colors border border-orange-200"
                                >
                                  Devolver
                                </button>
                                {!book.reservation && (
                                   <button 
                                      onClick={() => setReservationModalBook(book)}
                                      className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200"
                                      title="Reservar"
                                   >
                                      <Calendar className="w-4 h-4" />
                                   </button>
                                )}
                              </>
                            ) : (
                              <button 
                                onClick={() => setLoanModalBook(book)} 
                                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors border border-indigo-200"
                              >
                                <Hand className="w-3 h-3" /> Prestar
                              </button>
                            )}
                            {userRole === 'ADMIN' && (
                              <button 
                                onClick={(e) => handleRequestDelete(e, book.id, book.title)} 
                                className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar Libro"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>
        )}

        {/* --- STUDENTS VIEW (Hidden for STUDENT role) --- */}
        {currentTab === 'students' && userRole !== 'STUDENT' && (
          <div className="space-y-6 pb-20">
             <div className="flex flex-col sm:flex-row gap-3 mb-6">
                 <input
                     type="text"
                     placeholder="Buscar alumno..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="block w-full rounded-xl border-slate-200 py-2.5 px-4 shadow-sm"
                 />
                 {userRole === 'ADMIN' && (
                   <div className="flex gap-2 shrink-0 overflow-x-auto pb-2 sm:pb-0">
                       <input 
                         type="file" 
                         ref={studentFileInputRef} 
                         onChange={handleStudentFileImport} 
                         accept=".xlsx, .xls" 
                         className="hidden" 
                       />
                       <button onClick={downloadStudentTemplate} className="flex gap-2 px-3 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-xs items-center whitespace-nowrap">
                          <Download className="w-4 h-4 text-slate-500" />
                          <span className="inline">Plantilla</span>
                       </button>
                       <button onClick={handleStudentImportClick} className="flex gap-2 px-3 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-xs items-center whitespace-nowrap">
                          <FileSpreadsheet className="w-4 h-4 text-green-600" /> 
                          <span className="inline">Excel</span>
                       </button>
                       <button onClick={() => setIsStudentModalOpen(true)} className="flex gap-2 px-3 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-xs items-center whitespace-nowrap">
                          <UserPlus className="w-4 h-4" /> Nuevo
                       </button>
                   </div>
                 )}
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                 {filteredStudents.map(student => (
                   <div key={student.name} onClick={() => setSelectedStudent(student.name)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-200 relative active:scale-[0.99] transition-transform">
                      {userRole === 'ADMIN' && student.id && (
                        <button onClick={(e) => handleRequestDelete(e, student.id!, student.name, 'student')} className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                      )}
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0"><User className="w-5 h-5 text-slate-400" /></div>
                        <div>
                           <h3 className="font-bold text-slate-800 line-clamp-1">{student.name}</h3>
                           <p className="text-xs text-slate-500">{student.course}</p>
                        </div>
                      </div>
                   </div>
                 ))}
             </div>
          </div>
        )}

        {/* --- LOANS VIEW (Hidden for STUDENT role) --- */}
        {currentTab === 'loans' && userRole !== 'STUDENT' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden pb-safe mb-20 md:mb-0">
             <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Alumno</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Libro</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Fechas</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {filteredLoans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">{loan.status === 'ACTIVE' ? <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-0.5 rounded-full border border-green-100">Activo</span> : <span className="text-slate-500 text-xs bg-slate-100 px-2 py-0.5 rounded-full">Devuelto</span>}</td>
                        <td className="px-4 py-3 text-xs sm:text-sm font-bold text-indigo-600 cursor-pointer whitespace-nowrap" onClick={() => setSelectedStudent(loan.studentName)}>{loan.studentName}</td>
                        <td className="px-4 py-3 text-xs sm:text-sm text-slate-700 min-w-[150px]">{loan.bookTitle}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                           {loan.returnDate ? `Dev: ${new Date(loan.returnDate).toLocaleDateString()}` : `Lim: ${new Date(loan.dueDate).toLocaleDateString()}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        onLoginSuccess={(role) => {
          setUserRole(role);
          // Redirect to Dashboard immediately if not Student
          if (role !== 'STUDENT') {
            setCurrentTab('dashboard');
          }
        }} 
      />
      <AddBookModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={handleAddBooks} />
      <AddStudentModal isOpen={isStudentModalOpen} onClose={() => setIsStudentModalOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ConfirmationModal isOpen={!!deleteTarget} title="¿Eliminar?" message="Esta acción no se puede deshacer." onClose={() => setDeleteTarget(null)} onConfirm={executeDelete} confirmText="Eliminar" />
      <LoanModal isOpen={!!loanModalBook} book={loanModalBook} onClose={() => setLoanModalBook(null)} />
      <ReturnModal isOpen={!!returnModalLoan} loan={returnModalLoan} onClose={() => setReturnModalLoan(null)} />
      <BookDetailsModal isOpen={!!detailsBook} book={detailsBook} onClose={() => setDetailsBook(null)} />
      <StudentDetailsModal isOpen={!!selectedStudent} studentName={selectedStudent} allLoans={loans} onClose={() => setSelectedStudent(null)} />
      <PrintLabelsModal isOpen={isPrintModalOpen} books={getSelectedBooksList()} onClose={() => setIsPrintModalOpen(false)} />
      <ReservationModal isOpen={!!reservationModalBook} book={reservationModalBook} onClose={() => setReservationModalBook(null)} />
    </div>
  );
};

export default App;
