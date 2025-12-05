
import React, { useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { Book } from '../types';
import { STAGE_COLORS, GENRE_COLORS } from '../constants';

interface PrintLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
}

export const PrintLabelsModal: React.FC<PrintLabelsModalProps> = ({ isOpen, onClose, books }) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    // Create a temporary iframe to print
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Imprimir Tejuelos</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page { size: A4; margin: 10mm; }
            body { margin: 0; font-family: sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .label-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; }
            .label-item { break-inside: avoid; page-break-inside: avoid; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    // Wait for content (and tailwind) to load mostly, usually fast enough with CDN
    setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        // Cleanup after print dialog closes (or roughly)
        setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 1000);
  };

  // Helper to generate "Signatura" (e.g., ROW - har)
  const getSignatura = (author: string, title: string) => {
    const authCode = author.split(' ').pop()?.substring(0, 3).toUpperCase() || "AUT";
    const titleCode = title.substring(0, 3).toLowerCase();
    return { authCode, titleCode };
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Printer className="w-5 h-5 text-indigo-600" />
              Imprimir Tejuelos ({books.length})
            </h2>
            <p className="text-xs text-slate-500">Vista previa en formato A4 (4 columnas)</p>
          </div>
          <div className="flex gap-2">
             <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors">
               Cancelar
             </button>
             <button onClick={handlePrint} className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-bold shadow-lg shadow-indigo-200 flex items-center gap-2">
               <Printer className="w-4 h-4" /> Imprimir
             </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto bg-slate-200 p-8 custom-scrollbar">
           <div ref={printRef} className="bg-white shadow-xl mx-auto p-[10mm] min-h-[297mm] w-[210mm] origin-top scale-75 sm:scale-100">
              <div className="label-grid grid grid-cols-4 gap-4">
                 {books.map((book) => {
                    const { authCode, titleCode } = getSignatura(book.author, book.title);
                    const stageColor = STAGE_COLORS[book.stage];
                    const genreColor = GENRE_COLORS[book.genre];
                    
                    return (
                        <div key={book.id} className="label-item border border-slate-300 w-full aspect-[3/4] flex flex-col rounded overflow-hidden text-center relative">
                           {/* Color Band (Stage) */}
                           <div className={`h-6 w-full ${stageColor.bg} flex items-center justify-center`}>
                              <span className="text-[8px] text-white font-bold uppercase tracking-wider px-1 truncate">
                                {stageColor.label}
                              </span>
                           </div>
                           
                           {/* Body */}
                           <div className="flex-1 flex flex-col items-center justify-center p-2 bg-white gap-2">
                              {/* Genre Dot */}
                              <div className={`w-6 h-6 rounded-full ${genreColor.bg} ${genreColor.border} border shadow-sm`}></div>
                              
                              {/* Signatura */}
                              <div className="text-slate-900 font-mono leading-none">
                                 <div className="text-xl font-black">{authCode}</div>
                                 <div className="text-base font-medium text-slate-600">{titleCode}</div>
                              </div>
                           </div>

                           {/* Bottom Info */}
                           <div className="bg-slate-100 border-t border-slate-200 py-1 px-1">
                              <p className="text-[8px] text-slate-500 truncate">{book.title}</p>
                           </div>
                        </div>
                    );
                 })}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
