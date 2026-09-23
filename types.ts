export enum EducationalStage {
  INFANTIL = "Infantil y Preescolar (3-6 años)",
  PRIMARIA_INICIAL = "Primaria - Ciclo Inicial (6-8 años)",
  PRIMARIA_MEDIO = "Primaria - Ciclo Medio (8-10 años)",
  PRIMARIA_SUPERIOR = "Primaria - Ciclo Superior (10-12 años)",
  SECUNDARIA = "Secundaria Obligatoria (ESO) (12-16 años)",
  REFERENCIA = "Referencia / Consulta General"
}

export enum LiteraryGenre {
  NOVELA = "Novela / Ficción (General)",
  FANTASIA = "Fantasía / Ciencia Ficción",
  MISTERIO = "Misterio / Suspense",
  POESIA = "Poesía / Teatro",
  INFORMATIVO = "Informativo / No Ficción",
  BIOGRAFIAS = "Biografías / Historia",
  COMICS = "Cómics / Novela Gráfica"
}

export enum BookCondition {
  NEW = "Nuevo",
  GOOD = "Bueno",
  FAIR = "Usado/Desgastado",
  POOR = "Deteriorado",
  DAMAGED = "Dañado"
}

export type UserRole = 'ADMIN' | 'ASSISTANT' | 'STUDENT' | 'KIOSK';

export interface Student {
  id: string;
  name: string;
  course: string;
  barcode?: string;
  email?: string;
  phone?: string;
  sanctionedUntil?: string; // ISO date for penalties
  registeredAt: string;
}

export interface Loan {
  id: string;
  bookId: string;
  bookTitle: string;
  studentName: string;
  course: string;
  loanDate: string; // ISO Date
  dueDate: string; // ISO Date
  returnDate?: string; // ISO Date
  conditionOnLoan: BookCondition;
  conditionOnReturn?: BookCondition;
  status: 'ACTIVE' | 'RETURNED';
  rating?: number; // 1-5 stars
}

export interface Reservation {
  studentName: string;
  reservedAt: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  stage: EducationalStage;
  genre: LiteraryGenre;
  age: number; // Estimated age for verification

  // 👇👇👇 AQUÍ ESTÁ EL CAMBIO IMPORTANTE 👇👇👇
  coverImage?: string | null; // Base64 or URL (Ahora acepta null)

  column?: number;
  shelf?: number;
  synopsis?: string;
  addedAt: string;
  currentLoanId?: string; // If present, book is currently loaned out
  status?: 'AVAILABLE' | 'LOANED';
  condition?: BookCondition;
  rating?: number; // Average rating
  totalRatings?: number; // Count of ratings
  reservation?: Reservation; // Who is waiting for this book
  barcode?: string; // For physical scanning
}

export interface GeminiBookAnalysis {
  title: string;
  author: string;
  age: number;
  stage: EducationalStage;
  genre: LiteraryGenre;
  synopsis: string;
  reasoning: string;
}
