
import { EducationalStage, LiteraryGenre, GeminiBookAnalysis } from '../types';

// Helper to download image URL to Base64 (needed for local storage)
const urlToBase64 = async (url: string): Promise<string | undefined> => {
  try {
    // We try to fetch the image. Note: This might hit CORS issues depending on the source,
    // but Google Books thumbnails usually allow simple loading. 
    // For a robust app, a backend proxy is better, but here we try client-side.
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        // Return without prefix for consistency with existing app logic
        resolve(res.split(',')[1]); 
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Could not convert cover URL to base64", e);
    return undefined;
  }
};

const mapGoogleCategoriesToGenre = (categories: string[]): LiteraryGenre => {
  const catString = categories.join(' ').toLowerCase();
  
  if (catString.includes('fantasy') || catString.includes('magic') || catString.includes('science fiction') || catString.includes('sci-fi')) return LiteraryGenre.FANTASIA;
  if (catString.includes('mystery') || catString.includes('thriller') || catString.includes('crime') || catString.includes('detective')) return LiteraryGenre.MISTERIO;
  if (catString.includes('poetry') || catString.includes('drama') || catString.includes('play')) return LiteraryGenre.POESIA;
  if (catString.includes('comic') || catString.includes('graphic novel') || catString.includes('manga')) return LiteraryGenre.COMICS;
  if (catString.includes('biography') || catString.includes('autobiography') || catString.includes('memoir') || catString.includes('history')) return LiteraryGenre.BIOGRAFIAS;
  if (catString.includes('juvenile nonfiction') || catString.includes('science') || catString.includes('education')) return LiteraryGenre.INFORMATIVO;
  
  return LiteraryGenre.NOVELA; // Default
};

const estimateStageFromMetadata = (categories: string[], pageCount: number, description: string): EducationalStage => {
  const text = (categories.join(' ') + ' ' + description).toLowerCase();

  // 1. Explicit Age Groups
  if (text.includes('young adult') || text.includes('ya ') || text.includes('teen')) return EducationalStage.SECUNDARIA;
  if (text.includes('juvenile') || text.includes('children')) {
    // Sub-classify based on page count
    if (pageCount < 40) return EducationalStage.INFANTIL;
    if (pageCount < 100) return EducationalStage.PRIMARIA_INICIAL;
    if (pageCount < 200) return EducationalStage.PRIMARIA_MEDIO;
    return EducationalStage.PRIMARIA_SUPERIOR;
  }
  
  // 2. Page Count Heuristics for unknown categories
  if (pageCount > 0) {
    if (pageCount < 30) return EducationalStage.INFANTIL;
    if (pageCount < 80) return EducationalStage.PRIMARIA_INICIAL;
    if (pageCount < 150) return EducationalStage.PRIMARIA_MEDIO;
    if (pageCount < 250) return EducationalStage.PRIMARIA_SUPERIOR;
    if (pageCount < 400) return EducationalStage.SECUNDARIA;
  }

  return EducationalStage.REFERENCIA; // Default for heavy books or unknown
};

const estimateAgeFromStage = (stage: EducationalStage): number => {
  switch (stage) {
    case EducationalStage.INFANTIL: return 4;
    case EducationalStage.PRIMARIA_INICIAL: return 7;
    case EducationalStage.PRIMARIA_MEDIO: return 9;
    case EducationalStage.PRIMARIA_SUPERIOR: return 11;
    case EducationalStage.SECUNDARIA: return 14;
    case EducationalStage.REFERENCIA: return 16;
    default: return 0;
  }
};

export const searchBookByISBN = async (isbn: string): Promise<GeminiBookAnalysis> => {
  // 1. Query Google Books API
  // Using generic search for ISBN. 
  const cleanIsbn = isbn.replace(/-/g, '').trim();
  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`);
  
  if (!response.ok) {
    throw new Error("Error connecting to Google Books");
  }

  const data = await response.json();

  if (!data.items || data.items.length === 0) {
    throw new Error("Libro no encontrado con este ISBN.");
  }

  const info = data.items[0].volumeInfo;

  // 2. Extract Data
  const title = info.title || "Sin Título";
  const author = info.authors ? info.authors.join(', ') : "Autor Desconocido";
  const synopsis = info.description || "";
  const categories = info.categories || [];
  const pageCount = info.pageCount || 0;
  
  // 3. Map to App Enums
  const genre = mapGoogleCategoriesToGenre(categories);
  const stage = estimateStageFromMetadata(categories, pageCount, synopsis);
  const age = estimateAgeFromStage(stage);

  // 4. Handle Cover Image
  // Use highest resolution available, usually 'thumbnail' or 'smallThumbnail'
  let coverBase64 = undefined;
  if (info.imageLinks) {
     const imgUrl = info.imageLinks.thumbnail || info.imageLinks.smallThumbnail;
     if (imgUrl) {
       // Google http links cause mixed content warnings, ensure https
       const secureUrl = imgUrl.replace('http://', 'https://');
       coverBase64 = await urlToBase64(secureUrl);
     }
  }

  return {
    title,
    author,
    age,
    stage,
    genre,
    synopsis,
    reasoning: "Importado desde Google Books API",
    // We add the cover directly to the analysis object, though strictly the interface doesn't have it, 
    // we will merge it in the modal component.
    coverImage: coverBase64 
  } as GeminiBookAnalysis & { coverImage?: string }; 
};
