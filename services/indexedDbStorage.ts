import { Book, Loan, Student } from '../types';

const DB_NAME = 'BiblioClasificadorDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no está disponible en este entorno.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('books')) {
        db.createObjectStore('books', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('loans')) {
        db.createObjectStore('loans', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('students')) {
        db.createObjectStore('students', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

// Generic transaction helper
async function performTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);

    let result: any;
    try {
      const req = callback(store);
      if (req) {
        req.onsuccess = () => {
          result = req.result;
        };
      }
    } catch (err) {
      reject(err);
      return;
    }

    tx.oncomplete = () => {
      resolve(result);
    };

    tx.onerror = () => {
      reject(tx.error);
    };
  });
}

// Books Store Operations
export async function idbGetBooks(): Promise<Book[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('books', 'readonly');
      const store = tx.objectStore('books');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Fallback: no se pudo leer de IndexedDB', e);
    return [];
  }
}

export async function idbSaveBook(book: Book): Promise<void> {
  await performTransaction('books', 'readwrite', (store) => {
    store.put(book);
  });
}

export async function idbSaveBooksBatch(books: Book[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('books', 'readwrite');
    const store = tx.objectStore('books');

    books.forEach((b) => store.put(b));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbDeleteBook(id: string): Promise<void> {
  await performTransaction('books', 'readwrite', (store) => {
    store.delete(id);
  });
}

// Loans Store Operations
export async function idbGetLoans(): Promise<Loan[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('loans', 'readonly');
      const store = tx.objectStore('loans');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function idbSaveLoan(loan: Loan): Promise<void> {
  await performTransaction('loans', 'readwrite', (store) => {
    store.put(loan);
  });
}

// Students Store Operations
export async function idbGetStudents(): Promise<Student[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('students', 'readonly');
      const store = tx.objectStore('students');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function idbSaveStudent(student: Student): Promise<void> {
  await performTransaction('students', 'readwrite', (store) => {
    store.put(student);
  });
}

export async function idbSaveStudentsBatch(students: Student[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('students', 'readwrite');
    const store = tx.objectStore('students');

    students.forEach((s) => store.put(s));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbDeleteStudent(id: string): Promise<void> {
  await performTransaction('students', 'readwrite', (store) => {
    store.delete(id);
  });
}
