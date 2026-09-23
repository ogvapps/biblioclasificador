import { Book, Loan, Student, BookCondition, UserRole } from '../types';
import {
  isFirestoreReady,
  syncBookToFirestore,
  deleteBookFromFirestore,
  syncLoanToFirestore,
  syncStudentToFirestore,
  deleteStudentFromFirestore,
  initFirestore as _initFirestore
} from './firestoreSync';
import {
  idbGetBooks,
  idbSaveBook,
  idbSaveBooksBatch,
  idbDeleteBook,
  idbGetLoans,
  idbSaveLoan,
  idbGetStudents,
  idbSaveStudent,
  idbSaveStudentsBatch,
  idbDeleteStudent
} from './indexedDbStorage';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// In-memory cache for synchronous read performance
let cachedBooks: Book[] = [];
let cachedLoans: Loan[] = [];
let cachedStudents: Student[] = [];
let isInitialized = false;

// Initial migration and load from IndexedDB
const initializeStorage = async () => {
  if (isInitialized) return;

  try {
    const idbBooks = await idbGetBooks();
    const idbLoans = await idbGetLoans();
    const idbStudents = await idbGetStudents();

    // Migration from legacy localStorage if IndexedDB is empty
    if (idbBooks.length === 0 && idbLoans.length === 0 && idbStudents.length === 0) {
      const lsBooks: Book[] = JSON.parse(localStorage.getItem('books') || '[]');
      const lsLoans: Loan[] = JSON.parse(localStorage.getItem('loans') || '[]');
      const lsStudents: Student[] = JSON.parse(localStorage.getItem('students') || '[]');

      if (lsBooks.length > 0) await idbSaveBooksBatch(lsBooks);
      for (const loan of lsLoans) await idbSaveLoan(loan);
      if (lsStudents.length > 0) await idbSaveStudentsBatch(lsStudents);

      cachedBooks = lsBooks;
      cachedLoans = lsLoans;
      cachedStudents = lsStudents;
    } else {
      cachedBooks = idbBooks;
      cachedLoans = idbLoans;
      cachedStudents = idbStudents;
    }

    isInitialized = true;
    notifyBooks();
    notifyLoans();
    notifyStudents();
  } catch (err) {
    console.warn('Storage fallback to localStorage:', err);
    cachedBooks = JSON.parse(localStorage.getItem('books') || '[]');
    cachedLoans = JSON.parse(localStorage.getItem('loans') || '[]');
    cachedStudents = JSON.parse(localStorage.getItem('students') || '[]');
    isInitialized = true;
  }
};

// Start initialization immediately
if (typeof window !== 'undefined') {
  initializeStorage();
}

// PIN Management
export const validateAdminPin = (pin: string): boolean => {
  return pin === (localStorage.getItem('admin_pin') || '1234');
};

export const setAdminPin = (pin: string): void => {
  localStorage.setItem('admin_pin', pin);
};

export const verifyUserPin = (pin: string): UserRole | null => {
  const adminPin = localStorage.getItem('admin_pin') || '1234';
  const assistantPin = localStorage.getItem('assistant_pin') || '0000';

  if (pin === adminPin) return 'ADMIN';
  if (pin === assistantPin) return 'ASSISTANT';
  return null;
};

// Firebase Config / Cloud status
export const hasFirebaseConfig = (): boolean => !!localStorage.getItem('firebase_config');

export const getFirebaseConfig = (): any => {
  const data = localStorage.getItem('firebase_config');
  return data ? JSON.parse(data) : null;
};

export const saveFirebaseConfig = (config: any): void => {
  localStorage.setItem('firebase_config', JSON.stringify(config));
};

export const clearFirebaseConfig = (): void => {
  localStorage.removeItem('firebase_config');
};

export const isCloudConnected = (): boolean => isFirestoreReady();

/**
 * Initialize Firestore sync. Call this on app start and after saving Firebase config.
 * Returns true if connection succeeded.
 */
export const initFirestoreSync = async (): Promise<boolean> => _initFirestore();

// Observers
const listeners = {
  books: new Set<(books: Book[]) => void>(),
  loans: new Set<(loans: Loan[]) => void>(),
  students: new Set<(students: Student[]) => void>()
};

const notifyBooks = () => {
  const books = getBooks();
  listeners.books.forEach(fn => fn(books));
};

const notifyLoans = () => {
  const loans = getLoans();
  listeners.loans.forEach(fn => fn(loans));
};

const notifyStudents = () => {
  const students = getStudents();
  listeners.students.forEach(fn => fn(students));
};

export const subscribeToBooks = (cb: (books: Book[]) => void): (() => void) => {
  listeners.books.add(cb);
  cb(getBooks());
  return () => {
    listeners.books.delete(cb);
  };
};

export const subscribeToLoans = (cb: (loans: Loan[]) => void): (() => void) => {
  listeners.loans.add(cb);
  cb(getLoans());
  return () => {
    listeners.loans.delete(cb);
  };
};

export const subscribeToStudents = (cb: (students: Student[]) => void): (() => void) => {
  listeners.students.add(cb);
  cb(getStudents());
  return () => {
    listeners.students.delete(cb);
  };
};

// Synchronous getters from memory cache
export const getBooks = (): Book[] => {
  if (cachedBooks.length > 0 || isInitialized) return cachedBooks;
  try {
    return JSON.parse(localStorage.getItem('books') || '[]');
  } catch {
    return [];
  }
};

export const getLoans = (): Loan[] => {
  if (cachedLoans.length > 0 || isInitialized) return cachedLoans;
  try {
    return JSON.parse(localStorage.getItem('loans') || '[]');
  } catch {
    return [];
  }
};

export const getStudents = (): Student[] => {
  if (cachedStudents.length > 0 || isInitialized) return cachedStudents;
  try {
    return JSON.parse(localStorage.getItem('students') || '[]');
  } catch {
    return [];
  }
};

// Helper to safely backup light metadata into localStorage without heavy base64 images
const syncLocalStorageSafe = (key: string, data: any[]) => {
  try {
    if (key === 'books') {
      // Strip full base64 strings if too large for localStorage fallback
      const lightBooks = data.map(b => ({
        ...b,
        coverImage: b.coverImage && b.coverImage.length > 1000 ? '[IndexedDB-Stored]' : b.coverImage
      }));
      localStorage.setItem(key, JSON.stringify(lightBooks));
    } else {
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (e) {
    // If quota exceeded, IndexedDB is already preserving full data safely
    console.warn(`LocalStorage quota reached for ${key}, IndexedDB remains active.`, e);
  }
};

// Book Operations
export const saveBook = async (book: Book): Promise<void> => {
  const index = cachedBooks.findIndex(b => b.id === book.id);
  if (index > -1) {
    cachedBooks[index] = book;
  } else {
    cachedBooks.push(book);
  }
  await idbSaveBook(book);
  syncLocalStorageSafe('books', cachedBooks);
  notifyBooks();
  // Incremental cloud sync (fire-and-forget)
  syncBookToFirestore(book).catch(() => {});
};

export const updateBook = saveBook;

export const addBooksBatch = async (newBooksData: Omit<Book, 'id'>[]): Promise<Book[]> => {
  const newBooks: Book[] = newBooksData.map(b => ({
    ...b,
    id: generateId(),
    addedAt: b.addedAt || new Date().toISOString()
  }));

  cachedBooks = [...cachedBooks, ...newBooks];
  await idbSaveBooksBatch(newBooks);
  syncLocalStorageSafe('books', cachedBooks);
  notifyBooks();
  // Cloud sync all new books (fire-and-forget)
  newBooks.forEach(book => syncBookToFirestore(book).catch(() => {}));
  return newBooks;
};

export const deleteBook = async (id: string): Promise<void> => {
  cachedBooks = cachedBooks.filter(b => b.id !== id);
  await idbDeleteBook(id);
  syncLocalStorageSafe('books', cachedBooks);
  notifyBooks();
  deleteBookFromFirestore(id).catch(() => {});
};

export const reserveBook = async (bookId: string, studentName: string): Promise<void> => {
  const bookIndex = cachedBooks.findIndex(b => b.id === bookId);
  if (bookIndex > -1) {
    cachedBooks[bookIndex].reservation = {
      studentName,
      reservedAt: new Date().toISOString()
    };
    await idbSaveBook(cachedBooks[bookIndex]);
    syncLocalStorageSafe('books', cachedBooks);
    notifyBooks();
    syncBookToFirestore(cachedBooks[bookIndex]).catch(() => {});
  }
};

export const cancelReservation = async (bookId: string): Promise<void> => {
  const bookIndex = cachedBooks.findIndex(b => b.id === bookId);
  if (bookIndex > -1) {
    delete cachedBooks[bookIndex].reservation;
    await idbSaveBook(cachedBooks[bookIndex]);
    syncLocalStorageSafe('books', cachedBooks);
    notifyBooks();
    syncBookToFirestore(cachedBooks[bookIndex]).catch(() => {});
  }
};

// Student Operations
export const saveStudent = async (student: Student): Promise<void> => {
  const index = cachedStudents.findIndex(s => s.id === student.id);
  if (index > -1) {
    cachedStudents[index] = student;
  } else {
    cachedStudents.push(student);
  }
  await idbSaveStudent(student);
  syncLocalStorageSafe('students', cachedStudents);
  notifyStudents();
  syncStudentToFirestore(student).catch(() => {});
};

export const addStudent = async (studentData: Omit<Student, 'id'>): Promise<Student> => {
  const newStudent: Student = {
    ...studentData,
    id: generateId(),
    registeredAt: studentData.registeredAt || new Date().toISOString()
  };
  await saveStudent(newStudent);
  return newStudent;
};

export const addStudentsBatch = async (studentsData: Omit<Student, 'id'>[]): Promise<Student[]> => {
  const newStudents: Student[] = studentsData.map(s => ({
    ...s,
    id: generateId(),
    registeredAt: s.registeredAt || new Date().toISOString()
  }));

  cachedStudents = [...cachedStudents, ...newStudents];
  await idbSaveStudentsBatch(newStudents);
  syncLocalStorageSafe('students', cachedStudents);
  notifyStudents();
  newStudents.forEach(s => syncStudentToFirestore(s).catch(() => {}));
  return newStudents;
};

export const deleteStudent = async (id: string): Promise<void> => {
  cachedStudents = cachedStudents.filter(s => s.id !== id);
  await idbDeleteStudent(id);
  syncLocalStorageSafe('students', cachedStudents);
  notifyStudents();
  deleteStudentFromFirestore(id).catch(() => {});
};

// Loan Operations
export const saveLoan = async (loan: Loan): Promise<void> => {
  const index = cachedLoans.findIndex(l => l.id === loan.id);
  if (index > -1) {
    cachedLoans[index] = loan;
  } else {
    cachedLoans.push(loan);
  }
  await idbSaveLoan(loan);
  syncLocalStorageSafe('loans', cachedLoans);
  notifyLoans();
  syncLoanToFirestore(loan).catch(() => {});
};


export const returnBookWithRef = async (
  loan: Loan,
  returnDate: string,
  condition: BookCondition,
  rating?: number
): Promise<void> => {
  // 1. Update loan record
  const loanIndex = cachedLoans.findIndex(l => l.id === loan.id);
  if (loanIndex > -1) {
    cachedLoans[loanIndex].status = 'RETURNED';
    cachedLoans[loanIndex].returnDate = returnDate;
    cachedLoans[loanIndex].conditionOnReturn = condition;
    if (rating) cachedLoans[loanIndex].rating = rating;
    await idbSaveLoan(cachedLoans[loanIndex]);
    syncLocalStorageSafe('loans', cachedLoans);
    notifyLoans();
    syncLoanToFirestore(cachedLoans[loanIndex]).catch(() => {});
  }

  // 2. Update book: CRITICAL FIX - clear currentLoanId
  const bookIndex = cachedBooks.findIndex(b => b.id === loan.bookId);
  if (bookIndex > -1) {
    delete cachedBooks[bookIndex].currentLoanId;
    cachedBooks[bookIndex].status = 'AVAILABLE';
    cachedBooks[bookIndex].condition = condition;

    if (rating) {
      const currentRating = cachedBooks[bookIndex].rating || 0;
      const currentReviews = cachedBooks[bookIndex].totalRatings || 0;
      cachedBooks[bookIndex].rating = ((currentRating * currentReviews) + rating) / (currentReviews + 1);
      cachedBooks[bookIndex].totalRatings = currentReviews + 1;
    }

    await idbSaveBook(cachedBooks[bookIndex]);
    syncLocalStorageSafe('books', cachedBooks);
    notifyBooks();
    syncBookToFirestore(cachedBooks[bookIndex]).catch(() => {});
  }
};


// Full Database Backup / Restore (Useful to transfer between mobile and library PC)
export const exportFullDatabaseJSON = (): void => {
  const data = {
    appName: localStorage.getItem('biblio_app_name') || 'BiblioClasificador',
    exportedAt: new Date().toISOString(),
    books: getBooks(),
    loans: getLoans(),
    students: getStudents()
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BiblioClasificador_Backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const importFullDatabaseJSON = async (file: File): Promise<void> => {
  const text = await file.text();
  const data = JSON.parse(text);

  if (Array.isArray(data.books)) {
    cachedBooks = data.books;
    await idbSaveBooksBatch(data.books);
  }
  if (Array.isArray(data.loans)) {
    cachedLoans = data.loans;
    for (const loan of data.loans) {
      await idbSaveLoan(loan);
    }
  }
  if (Array.isArray(data.students)) {
    cachedStudents = data.students;
    await idbSaveStudentsBatch(data.students);
  }

  notifyBooks();
  notifyLoans();
  notifyStudents();
};
