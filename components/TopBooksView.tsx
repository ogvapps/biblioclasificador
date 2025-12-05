
import React, { useMemo } from 'react';
import { Book, Loan } from '../types';
import { BookOpen, Star, Trophy } from 'lucide-react';

interface TopBooksViewProps {
  books: Book[];
  loans: Loan[];
}

export const TopBooksView: React.FC<TopBooksViewProps> = ({ books, loans }) => {
  const topBooks = useMemo(() => {
    const counts = new Map<string, number>();
    
    // Count loans per book ID
    loans.forEach(loan => {
      counts.set(loan.bookId, (counts.get(loan.bookId) || 0) + 1);
    });

    // Map to array and enrich with Book metadata (author, cover, etc.)
    const sorted = Array.from(counts.entries())
      .map(([bookId, count]) => {
        const bookDetails = books.find(b => b.id === bookId);
        // Fallback title from loan history if book was deleted
        const fallbackTitle = loans.find(l => l.bookId === bookId)?.bookTitle || 'Libro desconocido';
        
        return {
          id: bookId,
          count,
          title: bookDetails?.title || fallbackTitle,
          author: bookDetails?.author || 'Autor desconocido',
          cover: bookDetails?.coverImage
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Get Top 5

    return sorted;
  }, [books, loans]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-indigo-500" />
        Libros Más Populares
      </h3>

      {topBooks.length === 0 ? (
        <p className="text-sm text-slate-400">Aún no hay suficientes datos de préstamos.</p>
      ) : (
        <div className="space-y-4">
          {topBooks.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 group">
              {/* Rank Badge */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-transform group-hover:scale-110 ${
                index === 0 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                index === 1 ? 'bg-slate-200 text-slate-600 border border-slate-300' :
                index === 2 ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                'bg-slate-50 text-slate-500'
              }`}>
                {index + 1}
              </div>

              {/* Book Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors">
                  {item.title}
                </p>
                <p className="text-xs text-slate-500 truncate">{item.author}</p>
              </div>

              {/* Count Badge */}
              <div className="flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100">
                <BookOpen className="w-3 h-3 text-indigo-500" />
                <span className="text-xs font-bold text-indigo-700">{item.count}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
