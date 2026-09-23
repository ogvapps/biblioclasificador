/**
 * firestoreSync.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Sincronización con Firestore usando lazy loading dinámico del SDK de Firebase.
 * El SDK NO se incluye en el bundle principal — solo se carga si el usuario
 * ha configurado credenciales en Settings.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Book, Loan, Student } from '../types';

// ─── State ────────────────────────────────────────────────────────────────────
let _db: any = null;          // Firestore instance
let _isReady = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getConfig() {
  const raw = localStorage.getItem('firebase_config');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns true if Firestore was successfully initialized */
export function isFirestoreReady(): boolean {
  return _isReady;
}

/**
 * Initializes Firebase App + Firestore with the config stored in localStorage.
 * Safe to call multiple times — re-uses existing app if already initialized.
 */
export async function initFirestore(): Promise<boolean> {
  const config = getConfig();
  if (!config || !config.apiKey || !config.projectId) return false;
  if (_isReady && _db) return true;

  try {
    // Lazy load: only fetched from CDN / bundle when needed
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    const { getFirestore, initializeFirestore, persistentLocalCache } = await import('firebase/firestore');

    const app = getApps().length === 0
      ? initializeApp(config)
      : getApp();

    // Use persistentLocalCache for offline support (Firebase 10+ way)
    try {
      _db = initializeFirestore(app, {
        localCache: persistentLocalCache()
      });
    } catch {
      // If already initialized, fall back to getFirestore
      _db = getFirestore(app);
    }

    _isReady = true;
    console.info('[Firestore] Conexión establecida con proyecto:', config.projectId);
    return true;
  } catch (err) {
    console.error('[Firestore] Error al inicializar:', err);
    _isReady = false;
    return false;
  }
}

function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        result[key] = sanitizeForFirestore(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

/**
 * Pushes local data to Firestore in bulk.
 * Uses batch writes (max 500 docs per batch).
 */
export async function pushToFirestore(
  books: Book[],
  loans: Loan[],
  students: Student[]
): Promise<void> {
  if (!_isReady || !_db) throw new Error('Firestore no inicializado');

  const {
    collection, doc, writeBatch
  } = await import('firebase/firestore');

  const runBatch = async (items: any[], collectionName: string, idField: string) => {
    const chunks: any[][] = [];
    for (let i = 0; i < items.length; i += 499) {
      chunks.push(items.slice(i, i + 499));
    }
    for (const chunk of chunks) {
      const batch = writeBatch(_db);
      for (const item of chunk) {
        const ref = doc(collection(_db, collectionName), item[idField]);
        batch.set(ref, sanitizeForFirestore(item));
      }
      await batch.commit();
    }
  };

  await runBatch(books, 'books', 'id');
  await runBatch(loans, 'loans', 'id');
  await runBatch(students, 'students', 'id');

  console.info('[Firestore] Push completado:', {
    books: books.length,
    loans: loans.length,
    students: students.length
  });
}

/**
 * Fetches all documents from Firestore and returns them.
 */
export async function pullFromFirestore(): Promise<{
  books: Book[];
  loans: Loan[];
  students: Student[];
}> {
  if (!_isReady || !_db) throw new Error('Firestore no inicializado');

  const { collection, getDocs } = await import('firebase/firestore');

  const fetchCollection = async <T>(name: string): Promise<T[]> => {
    const snap = await getDocs(collection(_db, name));
    return snap.docs.map(d => ({ ...d.data() } as T));
  };

  const [books, loans, students] = await Promise.all([
    fetchCollection<Book>('books'),
    fetchCollection<Loan>('loans'),
    fetchCollection<Student>('students'),
  ]);

  console.info('[Firestore] Pull completado:', {
    books: books.length,
    loans: loans.length,
    students: students.length
  });

  return { books, loans, students };
}

/**
 * Saves a single book document to Firestore.
 * Call after any local write for incremental sync.
 */
export async function syncBookToFirestore(book: Book): Promise<void> {
  if (!_isReady || !_db) return;
  const { collection, doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(collection(_db, 'books'), book.id), sanitizeForFirestore(book));
}

/**
 * Deletes a book document from Firestore.
 */
export async function deleteBookFromFirestore(bookId: string): Promise<void> {
  if (!_isReady || !_db) return;
  const { collection, doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(collection(_db, 'books'), bookId));
}

/**
 * Saves a single loan document to Firestore.
 */
export async function syncLoanToFirestore(loan: Loan): Promise<void> {
  if (!_isReady || !_db) return;
  const { collection, doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(collection(_db, 'loans'), loan.id), sanitizeForFirestore(loan));
}

/**
 * Saves a single student document to Firestore.
 */
export async function syncStudentToFirestore(student: Student): Promise<void> {
  if (!_isReady || !_db) return;
  const { collection, doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(collection(_db, 'students'), student.id), sanitizeForFirestore(student));
}

/**
 * Deletes a student document from Firestore.
 */
export async function deleteStudentFromFirestore(studentId: string): Promise<void> {
  if (!_isReady || !_db) return;
  const { collection, doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(collection(_db, 'students'), studentId));
}
