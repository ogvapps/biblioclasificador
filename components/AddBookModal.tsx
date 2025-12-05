
import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, Save, Camera, Trash2, Plus, AlertTriangle, Library, ScanBarcode, Search, BookOpen } from 'lucide-react';
import { EducationalStage, LiteraryGenre, Book, GeminiBookAnalysis } from '../types';
import { classifyImageWithGemini, fileToBase64 } from '../services/geminiService';
import { searchBookByISBN } from '../services/googleBooksService';
import { SpineLabel } from './SpineLabel';
import { LIBRARY_SETTINGS } from '../constants';
import { CameraCapture } from './CameraCapture';
import { BarcodeScanner } from './BarcodeScanner';

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (books: Omit<Book, 'id' | 'addedAt'>[]) => void;
}

// Temporary type for the batch list
interface StagedBook extends GeminiBookAnalysis {
  tempId: string;
  coverImage?: string; // Add optional cover image here to carry it over
}

// Utility to compress image - Aggressive settings for LocalStorage survival
const compressImage = (base64Str: string, maxWidth = 300, quality = 0.6): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Ensure header exists
    img.src = base64Str.startsWith('data:') ? base64Str : `data:image/jpeg;base64,${base64Str}`;
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error("Canvas context null"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        // Return compressed base64
        const compressedData = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedData);
      } catch (e) {
        reject(e);
      }
    };
    
    img.onerror = (e) => reject(e);
  });
};

export const AddBookModal: React.FC<AddBookModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [mode, setMode] = useState<'upload' | 'camera' | 'isbn'>('isbn');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  
  // ISBN State
  const [isbnInput, setIsbnInput] = useState('');
  
  // Steps Control
  const [showFinalizeStep, setShowFinalizeStep] = useState(false);
  
  // Batch State
  const [stagedBooks, setStagedBooks] = useState<StagedBook[]>([]);
  
  // Common Location State
  const [column, setColumn] = useState<number>(0); // 0 = unselected
  const [shelf, setShelf] = useState<number>(0);   // 0 = unselected

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Constants
  const columns = Array.from({ length: LIBRARY_SETTINGS.TOTAL_COLUMNS }, (_, i) => i + 1);
  const shelves = Array.from({ length: LIBRARY_SETTINGS.SHELVES_PER_COLUMN }, (_, i) => i + 1);

  if (!isOpen) return null;

  const processImage = async (base64: string, imgSrc: string) => {
    setLoading(true);
    setError(null);
    setPreviewImage(imgSrc);
    // Don't clear staged books automatically in photo mode, allows adding multiple photos? 
    // For now, let's keep behavior consistent: replace list or append? 
    // Current logic was replacement. Let's keep replacement for photo mode to avoid confusion.
    setStagedBooks([]); 
    setColumn(0);
    setShelf(0);

    try {
      // 1. Send to Gemini
      const analyses: GeminiBookAnalysis[] = await classifyImageWithGemini(base64);
      
      const newStagedBooks: StagedBook[] = analyses.map(analysis => ({
        ...analysis,
        tempId: Math.random().toString(36).substr(2, 9)
      }));

      if (newStagedBooks.length === 0) {
        setError("No se detectaron libros en la imagen. Intenta con una foto más clara.");
      } else {
        setStagedBooks(newStagedBooks);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "No se pudo analizar la imagen. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
      setMode('upload'); 
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    const objectUrl = URL.createObjectURL(file);
    await processImage(base64, objectUrl);
  };

  const handleCameraCapture = (imageSrc: string) => {
    setPreviewImage(imageSrc);
    setLoading(true);
    setMode('upload');

    // imageSrc is already data:image/jpeg;base64,...
    const base64 = imageSrc.split(',')[1];
    processImage(base64, imageSrc);
  };

  const executeSearch = async (isbn: string) => {
    setLoading(true);
    setError(null);

    try {
      const bookData = await searchBookByISBN(isbn);
      
      const newBook: StagedBook = {
        ...bookData,
        tempId: Math.random().toString(36).substr(2, 9),
        coverImage: (bookData as any).coverImage 
      };

      setStagedBooks(prev => [newBook, ...prev]);
      setIsbnInput(''); 
    } catch (err: any) {
      setError(err.message || "No se pudo encontrar el libro.");
    } finally {
      setLoading(false);
    }
  };

  const handleIsbnSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isbnInput.trim()) return;
    executeSearch(isbnInput);
  };

  const handleBarcodeDetected = (code: string) => {
    setShowScanner(false);
    setIsbnInput(code);
    executeSearch(code);
  };

  const removeStagedBook = (tempId: string) => {
    setStagedBooks(prev => prev.filter(b => b.tempId !== tempId));
  };

  const updateStagedBook = (tempId: string, field: keyof StagedBook, value: any) => {
    setStagedBooks(prev => prev.map(b => 
      b.tempId === tempId ? { ...b, [field]: value } : b
    ));
  };

  const handleInitiateSave = () => {
    if (stagedBooks.length === 0) return;
    setShowFinalizeStep(true);
  };

  const handleConfirmAndSave = async () => {
    if (column === 0 || shelf === 0) {
      alert("Por favor selecciona una Columna y una Balda.");
      return;
    }

    setIsSaving(true);
    try {
      // Prepare main image if in upload mode
      let globalImage = undefined;
      if (previewImage) {
        try {
          globalImage = await compressImage(previewImage, 300, 0.6);
        } catch (imgError) {
          console.warn("Global Compression failed", imgError);
        }
      }

      const booksToAdd: Omit<Book, 'id' | 'addedAt'>[] = await Promise.all(stagedBooks.map(async sb => {
        // If the specific book has a cover (from Google Books), use it. 
        // Otherwise use the global preview image (from Camera).
        let bookCover = globalImage;
        
        if (sb.coverImage) {
             // If Google provided a cover, we might need to compress it too or verify it's a data URL
             if (!sb.coverImage.startsWith('data:')) {
               bookCover = `data:image/jpeg;base64,${sb.coverImage}`;
             } else {
               bookCover = sb.coverImage;
             }
        }

        return {
          title: sb.title,
          author: sb.author,
          age: sb.age,
          stage: sb.stage,
          genre: sb.genre,
          synopsis: sb.synopsis,
          column: column,
          shelf: shelf,
          coverImage: bookCover
        };
      }));

      onAdd(booksToAdd);
      handleClose();
    } catch (e) {
      console.error("Critical error saving books", e);
      alert("Error crítico al guardar. Por favor intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setPreviewImage(null);
    setStagedBooks([]);
    setColumn(0);
    setShelf(0);
    setError(null);
    setShowFinalizeStep(false);
    setIsbnInput('');
    setMode('isbn'); // Reset to default nice mode
    onClose();
  };

  if (showScanner) {
      return <BarcodeScanner onScanSuccess={handleBarcodeDetected} onClose={() => setShowScanner(false)} />;
  }

  if (mode === 'camera') {
    return <CameraCapture onCapture={handleCameraCapture} onClose={() => setMode('upload')} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 overflow-hidden">
      <div className="bg-white h-full w-full sm:h-auto sm:rounded-xl shadow-2xl sm:max-w-5xl flex flex-col md:flex-row my-auto overflow-hidden sm:max-h-[85vh] relative animate-in slide-in-from-bottom-4 duration-300 sm:zoom-in-95">
        
        {/* Step: Finalize Location & Save Overlay */}
        {showFinalizeStep && (
          <div className="absolute inset-0 z-[70] flex items-center justify-center bg-white/95 backdrop-blur-md p-6 animate-in fade-in duration-300">
            <div className="bg-white border-2 border-indigo-100 shadow-2xl rounded-2xl p-8 max-w-md w-full text-center relative overflow-y-auto max-h-full">
              <button 
                onClick={() => setShowFinalizeStep(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100 shrink-0">
                <Library className="w-10 h-10 text-emerald-600" />
              </div>
              
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Finalizar Importación</h3>
              <p className="text-slate-500 mb-8">
                Vas a añadir <strong className="text-indigo-600">{stagedBooks.length} libro(s)</strong>.
                <br/>Confirma su ubicación física.
              </p>
              
              <div className="space-y-4 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
                 <div className="text-left">
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1 ml-1">Columna</label>
                    <select 
                      value={column}
                      onChange={(e) => setColumn(parseInt(e.target.value))}
                      className={`w-full p-3 rounded-lg border-2 text-lg outline-none transition-all ${column === 0 ? 'border-slate-200' : 'border-indigo-500 bg-white text-indigo-900 font-bold'}`}
                    >
                      <option value={0}>Seleccionar...</option>
                      {columns.map(c => <option key={c} value={c}>Columna {c}</option>)}
                    </select>
                 </div>
                 
                 <div className="text-left">
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1 ml-1">Balda</label>
                    <select 
                      value={shelf}
                      onChange={(e) => setShelf(parseInt(e.target.value))}
                      className={`w-full p-3 rounded-lg border-2 text-lg outline-none transition-all ${shelf === 0 ? 'border-slate-200' : 'border-indigo-500 bg-white text-indigo-900 font-bold'}`}
                    >
                      <option value={0}>Seleccionar...</option>
                      {shelves.map(s => <option key={s} value={s}>Balda {s}</option>)}
                    </select>
                 </div>
              </div>

              <button 
                onClick={handleConfirmAndSave}
                disabled={column === 0 || shelf === 0 || isSaving}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-6 h-6" />
                    CONFIRMAR Y GUARDAR
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Left Side: Input Methods */}
        <div className="w-full md:w-1/3 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 min-h-[30vh] max-h-[40vh] md:max-h-full">
          <div className="flex justify-between items-center p-4 border-b border-slate-100 md:hidden bg-white safe-top">
             <h2 className="text-lg font-bold text-slate-800">Añadir Libros</h2>
             <button onClick={handleClose} className="p-1"><X className="w-6 h-6 text-slate-500" /></button>
          </div>

          <div className="p-3 sm:p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible no-scrollbar">
             <button 
               onClick={() => setMode('isbn')}
               className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap flex-shrink-0 ${mode === 'isbn' ? 'bg-white shadow-md text-indigo-600 border border-indigo-100' : 'text-slate-500 hover:bg-slate-100'}`}
             >
               <ScanBarcode className="w-5 h-5" />
               <span className="font-bold">Escanear ISBN</span>
             </button>
             <button 
               onClick={() => { setMode('upload'); }}
               className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap flex-shrink-0 ${mode === 'upload' ? 'bg-white shadow-md text-indigo-600 border border-indigo-100' : 'text-slate-500 hover:bg-slate-100'}`}
             >
               <Upload className="w-5 h-5" />
               <span className="font-bold">Subir Foto</span>
             </button>
             <button 
               onClick={() => setMode('camera')}
               className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap flex-shrink-0 hover:bg-indigo-50 text-indigo-600 font-medium`}
             >
               <Camera className="w-5 h-5" />
               <span className="font-bold">Cámara</span>
             </button>
          </div>

          <div className="flex-1 p-4 flex flex-col min-h-0 overflow-y-auto">
             {mode === 'isbn' && (
                <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-left-4 duration-300">
                   <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ScanBarcode className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                      </div>
                      <h3 className="font-bold text-slate-800 mb-1">Ingresar ISBN</h3>
                      <p className="text-xs text-slate-500 mb-4 hidden sm:block">Usa un lector de códigos de barras, la cámara o escribe el número.</p>
                      
                      <button 
                         onClick={() => setShowScanner(true)}
                         className="w-full mb-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                      >
                         <Camera className="w-4 h-4" />
                         Escanear con Cámara
                      </button>

                      <div className="flex items-center gap-2 my-2 opacity-50">
                        <div className="h-px bg-slate-300 flex-1"></div>
                        <span className="text-[10px] sm:text-xs font-semibold">O manual</span>
                        <div className="h-px bg-slate-300 flex-1"></div>
                      </div>
                      
                      <form onSubmit={handleIsbnSearch} className="flex gap-2">
                        <input 
                          type="text" 
                          value={isbnInput}
                          onChange={(e) => setIsbnInput(e.target.value)}
                          placeholder="Ej: 978-3-16..."
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          autoFocus
                        />
                        <button 
                          type="submit"
                          disabled={loading || !isbnInput}
                          className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                        </button>
                      </form>
                   </div>
                   <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-xl text-xs leading-relaxed border border-blue-100 hidden sm:block">
                     <strong>Tip:</strong> Puedes escanear varios libros seguidos.
                   </div>
                </div>
             )}

             {mode === 'upload' && (
                <div className="flex-1 flex flex-col relative animate-in fade-in slide-in-from-left-4 duration-300">
                  <div 
                    className="w-full flex-1 min-h-[120px] bg-slate-200 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-slate-300 relative overflow-hidden group shadow-inner"
                  >
                    {previewImage ? (
                      <img src={previewImage} alt="Preview" className="w-full h-full object-contain bg-black/5" />
                    ) : (
                      <div className="text-center p-4">
                        <Upload className="w-8 h-8 sm:w-12 sm:h-12 text-slate-400 mx-auto mb-2" />
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">Sube una foto</p>
                      </div>
                    )}
                    
                    {loading && (
                      <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center backdrop-blur-sm z-10">
                        <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600 animate-spin mb-3" />
                        <p className="text-sm sm:text-base font-bold text-indigo-700">Analizando...</p>
                      </div>
                    )}
                  </div>
                  <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="mt-4 w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                     disabled={loading}
                  >
                    Seleccionar Archivo
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
             )}
          </div>
        </div>

        {/* Right Side: Results & Form - Uses min-h-0 to fix overflow issues in flex children */}
        <div className="w-full md:w-2/3 flex flex-col bg-white h-full min-h-0">
          <div className="p-5 border-b border-slate-100 justify-between items-center bg-white sticky top-0 z-10 shrink-0 hidden md:flex">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Lista de Libros</h2>
              <p className="text-sm text-slate-500">Revisa los datos antes de guardar.</p>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-full hidden md:block">
              <X className="w-6 h-6 text-slate-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50/50 min-h-0">
            {error && (
               <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 mb-4 flex items-start gap-2">
                 <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                 <p>{error}</p>
               </div>
            )}

            {stagedBooks.length === 0 && !loading && !error && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 opacity-60">
                <BookOpen className="w-16 h-16 mb-4 text-slate-300" />
                <p>Los libros añadidos aparecerán aquí.</p>
              </div>
            )}

            <div className="space-y-4 pb-20 md:pb-0">
              {stagedBooks.map((book) => (
                <div key={book.tempId} className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-start relative group animate-in slide-in-from-bottom-2 duration-300">
                  <button 
                    onClick={() => removeStagedBook(book.tempId)}
                    className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors z-10"
                    title="Eliminar libro"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex-shrink-0 mx-auto sm:mx-0 flex flex-col items-center gap-2">
                    {book.coverImage && (
                        <div className="w-12 h-16 rounded overflow-hidden border border-slate-200 shadow-sm">
                            <img 
                                src={book.coverImage.startsWith('data:') ? book.coverImage : `data:image/jpeg;base64,${book.coverImage}`} 
                                className="w-full h-full object-cover" 
                                alt="Cover"
                            />
                        </div>
                    )}
                    <SpineLabel stage={book.stage} genre={book.genre} size="md" />
                  </div>

                  <div className="flex-1 w-full space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                       <div className="sm:col-span-7">
                         <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Título</label>
                         <input 
                           type="text" 
                           value={book.title}
                           onChange={(e) => updateStagedBook(book.tempId, 'title', e.target.value)}
                           className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                         />
                       </div>
                       <div className="sm:col-span-5">
                         <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Autor</label>
                         <input 
                           type="text" 
                           value={book.author}
                           onChange={(e) => updateStagedBook(book.tempId, 'author', e.target.value)}
                           className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                         />
                       </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Edad</label>
                        <input 
                           type="number" 
                           value={book.age}
                           onChange={(e) => updateStagedBook(book.tempId, 'age', parseInt(e.target.value))}
                           className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-slate-50 outline-none"
                         />
                      </div>
                      <div className="col-span-2 sm:col-span-3 grid grid-cols-2 gap-2">
                         <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Etapa</label>
                            <select 
                              value={book.stage}
                              onChange={(e) => updateStagedBook(book.tempId, 'stage', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-slate-50 outline-none"
                            >
                              {Object.values(EducationalStage).map(s => <option key={s} value={s}>{s.split('(')[0]}</option>)}
                            </select>
                         </div>
                         <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Género</label>
                            <select 
                              value={book.genre}
                              onChange={(e) => updateStagedBook(book.tempId, 'genre', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-slate-50 outline-none"
                            >
                               {Object.values(LiteraryGenre).map(g => <option key={g} value={g}>{g.split('(')[0]}</option>)}
                            </select>
                         </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Sinopsis</label>
                      <textarea
                         value={book.synopsis || ''}
                         onChange={(e) => updateStagedBook(book.tempId, 'synopsis', e.target.value)}
                         className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-slate-50 outline-none resize-none h-16"
                         placeholder="Sinopsis breve del libro..."
                      />
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer - Summary & Save */}
          <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 shrink-0 pb-safe">
             <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="text-sm text-slate-500 hidden md:block">
                  {stagedBooks.length > 0 ? `${stagedBooks.length} libro(s) listo(s)` : 'Agrega libros para guardar'}
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                   <button 
                     onClick={handleClose}
                     disabled={isSaving}
                     className="flex-1 md:flex-none px-4 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={handleInitiateSave}
                     disabled={stagedBooks.length === 0 || isSaving}
                     className="flex-1 md:flex-none px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform active:scale-95 transition-all"
                   >
                     <Plus className="w-5 h-5" />
                     {stagedBooks.length > 0 
                        ? `AGREGAR (${stagedBooks.length})` 
                        : 'AGREGAR'
                     }
                   </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
