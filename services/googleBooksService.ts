import { EducationalStage, LiteraryGenre, GeminiBookAnalysis } from '../types';

interface GoogleBookItem {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    description?: string;
    categories?: string[];
    pageCount?: number;
    publishedDate?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
}

// Heuristics to infer educational stage from categories, page count and description
function inferEducationalStage(categories: string[], description: string, pageCount?: number): { stage: EducationalStage; age: number } {
  const text = `${categories.join(' ')} ${description}`.toLowerCase();

  if (text.includes('juvenile') || text.includes('infantil') || text.includes('preescolar') || (pageCount && pageCount <= 40)) {
    if (text.includes('bebé') || text.includes('preescolar') || (pageCount && pageCount <= 24)) {
      return { stage: EducationalStage.INFANTIL, age: 4 };
    }
    return { stage: EducationalStage.PRIMARIA_INICIAL, age: 7 };
  }

  if (text.includes('young adult') || text.includes('juvenil') || text.includes('secundaria') || text.includes('eso')) {
    return { stage: EducationalStage.SECUNDARIA, age: 14 };
  }

  if (text.includes('diccionario') || text.includes('enciclopedia') || text.includes('atlas') || text.includes('referencia')) {
    return { stage: EducationalStage.REFERENCIA, age: 12 };
  }

  if (pageCount && pageCount < 100) {
    return { stage: EducationalStage.PRIMARIA_MEDIO, age: 9 };
  }

  if (pageCount && pageCount <= 180) {
    return { stage: EducationalStage.PRIMARIA_SUPERIOR, age: 11 };
  }

  return { stage: EducationalStage.SECUNDARIA, age: 13 };
}

// Heuristics to infer literary genre from categories and description
function inferLiteraryGenre(categories: string[], description: string): LiteraryGenre {
  const text = `${categories.join(' ')} ${description}`.toLowerCase();

  if (text.includes('comic') || text.includes('manga') || text.includes('graphic novel') || text.includes('novela gráfica') || text.includes('tebeo')) {
    return LiteraryGenre.COMICS;
  }
  if (text.includes('fantasy') || text.includes('fantasía') || text.includes('science fiction') || text.includes('ciencia ficción') || text.includes('magia')) {
    return LiteraryGenre.FANTASIA;
  }
  if (text.includes('mystery') || text.includes('misterio') || text.includes('detective') || text.includes('suspense') || text.includes('policíaca')) {
    return LiteraryGenre.MISTERIO;
  }
  if (text.includes('poetry') || text.includes('poesía') || text.includes('drama') || text.includes('teatro')) {
    return LiteraryGenre.POESIA;
  }
  if (text.includes('biography') || text.includes('biografía') || text.includes('autobiography') || text.includes('historia') || text.includes('history')) {
    return LiteraryGenre.BIOGRAFIAS;
  }
  if (text.includes('non-fiction') || text.includes('no ficción') || text.includes('science') || text.includes('ciencia') || text.includes('encyclopedia') || text.includes('education')) {
    return LiteraryGenre.INFORMATIVO;
  }

  return LiteraryGenre.NOVELA;
}

export async function searchBookByISBN(isbn: string): Promise<GeminiBookAnalysis & { coverImage?: string | null }> {
  const cleanIsbn = isbn.replace(/[-\s]/g, '').trim();

  if (!cleanIsbn) {
    throw new Error('ISBN no válido');
  }

  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(cleanIsbn)}`);

  if (!response.ok) {
    throw new Error(`Error al consultar Google Books API (${response.status})`);
  }

  const data = await response.json();

  if (!data.items || data.items.length === 0) {
    throw new Error(`No se encontró ningún libro con el ISBN ${isbn}`);
  }

  const item: GoogleBookItem = data.items[0];
  const info = item.volumeInfo || {};

  const title = info.title || 'Título desconocido';
  const author = info.authors ? info.authors.join(', ') : 'Autor desconocido';
  const synopsis = info.description ? (info.description.length > 300 ? `${info.description.substring(0, 297)}...` : info.description) : 'Sin sinopsis disponible.';
  const categories = info.categories || [];

  const { stage, age } = inferEducationalStage(categories, synopsis, info.pageCount);
  const genre = inferLiteraryGenre(categories, synopsis);

  // Normalize image URL to https
  let coverImage = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;
  if (coverImage && coverImage.startsWith('http://')) {
    coverImage = coverImage.replace('http://', 'https://');
  }

  return {
    title,
    author,
    age,
    stage,
    genre,
    synopsis,
    reasoning: `Clasificado automáticamente a partir de datos de Google Books (${categories.join(', ') || 'General'}).`,
    coverImage
  };
}
