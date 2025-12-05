
import { Book, Loan, Student, Reservation, UserRole } from '../types';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc,
  deleteDoc, 
  updateDoc, 
  onSnapshot,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';

const ADMIN_PIN_KEY = 'biblio_admin_pin';
const FIREBASE_CONFIG_KEY = 'biblio_firebase_config';
const ASSISTANT_PIN = '1875';

// Default Config using Vite Environment Variables
// Casting import.meta to any to avoid TypeScript errors if types are not fully configured
const env = (import.meta as any).env;

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY || "",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: env.VITE_FIREBASE_APP_ID || ""
};

// --- State ---
let db: any = null;
let isCloudEnabled = false;

// Listeners for LocalStorage fallback
const localBookListeners: ((books: Book[]) => void)[] = [];
const localLoanListeners: ((loans: Loan[]) => void)[] = [];
const localStudentListeners: ((students: Student[]) => void)[] = [];

// --- Initialization ---

export const getFirebaseConfig = () => {
  const stored = localStorage.getItem(FIREBASE_CONFIG_KEY);
  // Return stored config if exists, otherwise return default env config
  return stored ? JSON.parse(stored) : DEFAULT_FIREBASE_CONFIG;
};

export const saveFirebaseConfig = (config: any) => {
  localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
  window.location.reload(); // Reload to init firebase
};

export const clearFirebaseConfig = () => {
  localStorage.removeItem(FIREBASE_CONFIG_KEY);
  window.location.reload();
};

export const isCloudConnected = () => isCloudEnabled;

const initFirebase = () => {
  try {
    const config = getFirebaseConfig();
    
    // Check if config has basic required fields
    if (config && config.apiKey && config.projectId) {
      // Use existing app if initialized, otherwise create new
      const app = getApps().length > 0 ? getApp() : initializeApp(config);
      
      try {
        db = getFirestore(app);
        isCloudEnabled = true;
        console.log("Firebase Connected");
      } catch (firestoreError: any) {
         console.error("Firestore Init Error:", firestoreError);
         if (firestoreError.code === 'app/service-not-available') {
             console.warn("Service not available. Attempting fallback or check network.");
         }
         isCloudEnabled = false;
      }
    }
  } catch (e) {
    console.error("Firebase Init Error:", e);
    isCloudEnabled = false;
  }
};

// Auto-init on load
initFirebase();

// --- Auth / PIN ---

export const verifyUserPin = (pin: string): UserRole | null => {
  const storedAdminPin = localStorage.getItem(ADMIN_PIN_KEY) || '2025'; // Default Admin PIN
  
  if (pin === storedAdminPin) return 'ADMIN';
  if (pin === ASSISTANT_PIN) return 'ASSISTANT';
  
  return null;
};

export const setAdminPin = (newPin: string) => {
  localStorage.setItem(ADMIN_PIN_KEY, newPin);
};

// --- Local Helpers ---
const notifyLocalBooks = () => {
  const localData = localStorage.getItem('biblio_books_local');
  const books: Book[] = localData ? JSON.parse(localData) : [];
  localBookListeners.forEach(cb => cb(books));
};
const notifyLocalLoans = () => {
  const localData = localStorage.getItem('biblio_loans_local');
  const loans: Loan[] = localData ? JSON.parse(localData) : [];
  localLoanListeners.forEach(cb => cb(loans));
};
const notifyLocalStudents = () => {
  const localData = localStorage.getItem('biblio_students_local');
  const students: Student[] = localData ? JSON.parse(localData) : [];
  localStudentListeners.forEach(cb => cb(students));
};


// --- BOOKS ---

export const subscribeToBooks = (callback: (books: Book[]) => void) => {
  if (isCloudEnabled && db) {
    // Cloud Mode
    try {
      const q = query(collection(db, 'books'), orderBy('addedAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
        callback(books);
      }, (error) => {
        console.error("Firestore Error:", error);
        // Fallback to local if permission denied or error
        const localData = localStorage.getItem('biblio_books_local');
        callback(localData ? JSON.parse(localData) : []);
      });
      return unsubscribe;
    } catch (e) {
      console.error("Subscribe Error:", e);
      // Fallback
      const localData = localStorage.getItem('biblio_books_local');
      callback(localData ? JSON.parse(localData) : []);
      return () => {};
    }
  } else {
    // Local Mode
    const loadLocal = () => {
      const localData = localStorage.getItem('biblio_books_local');
      callback(localData ? JSON.parse(localData) : []);
    };
    loadLocal();
    localBookListeners.push(callback);
    const handler = (e: StorageEvent) => { if (e.key === 'biblio_books_local') loadLocal(); };
    window.addEventListener('storage', handler);
    return () => {
      const idx = localBookListeners.indexOf(callback);
      if (idx > -1) localBookListeners.splice(idx, 1);
      window.removeEventListener('storage', handler);
    };
  }
};

export const addBook = async (book: Omit<Book, 'id'>) => {
  if (isCloudEnabled && db) {
    await addDoc(collection(db, 'books'), book);
  } else {
    const localData = localStorage.getItem('biblio_books_local');
    const books: Book[] = localData ? JSON.parse(localData) : [];
    const newBook = { ...book, id: Math.random().toString(36).substr(2, 9) };
    localStorage.setItem('biblio_books_local', JSON.stringify([newBook, ...books]));
    notifyLocalBooks();
  }
};

export const addBooksBatch = async (books: Omit<Book, 'id'>[]) => {
  if (isCloudEnabled && db) {
    const batch = writeBatch(db);
    books.forEach(book => {
      const docRef = doc(collection(db, 'books')); // Auto-ID
      batch.set(docRef, book);
    });
    await batch.commit();
  } else {
    const localData = localStorage.getItem('biblio_books_local');
    const currentBooks: Book[] = localData ? JSON.parse(localData) : [];
    const newBooks = books.map(b => ({ ...b, id: Math.random().toString(36).substr(2, 9) }));
    localStorage.setItem('biblio_books_local', JSON.stringify([...newBooks, ...currentBooks]));
    notifyLocalBooks();
  }
};

export const deleteBook = async (id: string) => {
  if (isCloudEnabled && db) {
    await deleteDoc(doc(db, 'books', id));
  } else {
    const localData = localStorage.getItem('biblio_books_local');
    if (localData) {
      const books: Book[] = JSON.parse(localData);
      const updated = books.filter(b => b.id !== id);
      localStorage.setItem('biblio_books_local', JSON.stringify(updated));
      notifyLocalBooks();
    }
  }
};

export const reserveBook = async (bookId: string, studentName: string) => {
  const reservation: Reservation = {
    studentName,
    reservedAt: new Date().toISOString()
  };

  if (isCloudEnabled && db) {
    const bookRef = doc(db, 'books', bookId);
    await updateDoc(bookRef, { reservation });
  } else {
    const localData = localStorage.getItem('biblio_books_local');
    if (localData) {
      const books: Book[] = JSON.parse(localData);
      const bookIndex = books.findIndex(b => b.id === bookId);
      if (bookIndex !== -1) {
        books[bookIndex] = { ...books[bookIndex], reservation };
        localStorage.setItem('biblio_books_local', JSON.stringify(books));
        notifyLocalBooks();
      }
    }
  }
};

export const cancelReservation = async (bookId: string) => {
  if (isCloudEnabled && db) {
    const bookRef = doc(db, 'books', bookId);
    await updateDoc(bookRef, { reservation: null });
  } else {
    const localData = localStorage.getItem('biblio_books_local');
    if (localData) {
      const books: Book[] = JSON.parse(localData);
      const bookIndex = books.findIndex(b => b.id === bookId);
      if (bookIndex !== -1) {
        delete books[bookIndex].reservation;
        localStorage.setItem('biblio_books_local', JSON.stringify(books));
        notifyLocalBooks();
      }
    }
  }
};


// --- LOANS ---

export const subscribeToLoans = (callback: (loans: Loan[]) => void) => {
  if (isCloudEnabled && db) {
    try {
      const q = query(collection(db, 'loans'), orderBy('loanDate', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const loans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
        callback(loans);
      });
    } catch (e) {
      console.error("Subscribe Loans Error", e);
      return () => {};
    }
  } else {
    const loadLocal = () => {
      const localData = localStorage.getItem('biblio_loans_local');
      callback(localData ? JSON.parse(localData) : []);
    };
    loadLocal();
    localLoanListeners.push(callback);
    const handler = (e: StorageEvent) => { if (e.key === 'biblio_loans_local') loadLocal(); };
    window.addEventListener('storage', handler);
    return () => {
      const idx = localLoanListeners.indexOf(callback);
      if (idx > -1) localLoanListeners.splice(idx, 1);
      window.removeEventListener('storage', handler);
    };
  }
};

export const lendBook = async (loan: Omit<Loan, 'id'>) => {
  if (isCloudEnabled && db) {
    // 1. Add Loan
    const loanRef = await addDoc(collection(db, 'loans'), loan);
    // 2. Update Book Status AND Clear Reservation
    const bookRef = doc(db, 'books', loan.bookId);
    await updateDoc(bookRef, { 
      currentLoanId: loanRef.id,
      reservation: null // Clear reservation when loaned
    });
  } else {
    const loansData = localStorage.getItem('biblio_loans_local');
    const booksData = localStorage.getItem('biblio_books_local');
    let loans: Loan[] = loansData ? JSON.parse(loansData) : [];
    let books: Book[] = booksData ? JSON.parse(booksData) : [];

    const newLoanId = Math.random().toString(36).substr(2, 9);
    const newLoan = { ...loan, id: newLoanId };

    const bookIndex = books.findIndex(b => b.id === loan.bookId);
    if (bookIndex !== -1) {
      // Clear reservation locally
      const { reservation, ...rest } = books[bookIndex];
      const updatedBook = { ...rest, currentLoanId: newLoanId } as Book;
      
      books[bookIndex] = updatedBook;
      loans = [newLoan, ...loans];
      localStorage.setItem('biblio_books_local', JSON.stringify(books));
      localStorage.setItem('biblio_loans_local', JSON.stringify(loans));
      notifyLocalBooks();
      notifyLocalLoans();
    }
  }
};

export const returnBookWithRef = async (loan: Loan, returnDate: string, conditionOnReturn: string, rating?: number) => {
  if (isCloudEnabled && db) {
    // 1. Update Loan
    const loanRef = doc(db, 'loans', loan.id);
    const loanUpdate: any = {
      returnDate,
      conditionOnReturn,
      status: 'RETURNED'
    };
    if (rating !== undefined) loanUpdate.rating = rating;
    await updateDoc(loanRef, loanUpdate);

    // 2. Update Book (Status & Rating)
    const bookRef = doc(db, 'books', loan.bookId);
    
    // We need to fetch the book to calculate average rating
    if (rating !== undefined) {
      const bookSnap = await getDoc(bookRef);
      if (bookSnap.exists()) {
        const bookData = bookSnap.data() as Book;
        const currentTotal = bookData.totalRatings || 0;
        const currentAvg = bookData.rating || 0;
        
        const newTotal = currentTotal + 1;
        // Formula: NewAvg = ((OldAvg * OldTotal) + NewRating) / NewTotal
        const newAvg = ((currentAvg * currentTotal) + rating) / newTotal;

        await updateDoc(bookRef, { 
          currentLoanId: "",
          rating: newAvg,
          totalRatings: newTotal
        });
      } else {
         await updateDoc(bookRef, { currentLoanId: "" });
      }
    } else {
      await updateDoc(bookRef, { currentLoanId: "" }); 
    }

  } else {
    const loansData = localStorage.getItem('biblio_loans_local');
    const booksData = localStorage.getItem('biblio_books_local');
    let loans: Loan[] = loansData ? JSON.parse(loansData) : [];
    let books: Book[] = booksData ? JSON.parse(booksData) : [];

    const loanIndex = loans.findIndex(l => l.id === loan.id);
    if (loanIndex !== -1) {
      loans[loanIndex] = { 
        ...loans[loanIndex], 
        returnDate, 
        conditionOnReturn: conditionOnReturn as any, 
        status: 'RETURNED',
        rating
      };
    }
    const bookIndex = books.findIndex(b => b.id === loan.bookId);
    if (bookIndex !== -1) {
      const book = books[bookIndex];
      const { currentLoanId, ...rest } = book;
      
      let updatedBook = { ...rest } as Book;

      // Calculate Rating locally
      if (rating !== undefined) {
         const currentTotal = book.totalRatings || 0;
         const currentAvg = book.rating || 0;
         const newTotal = currentTotal + 1;
         const newAvg = ((currentAvg * currentTotal) + rating) / newTotal;
         updatedBook.rating = newAvg;
         updatedBook.totalRatings = newTotal;
      }

      books[bookIndex] = updatedBook;
    }

    localStorage.setItem('biblio_books_local', JSON.stringify(books));
    localStorage.setItem('biblio_loans_local', JSON.stringify(loans));
    notifyLocalBooks();
    notifyLocalLoans();
  }
};


// --- STUDENTS ---

export const subscribeToStudents = (callback: (students: Student[]) => void) => {
  if (isCloudEnabled && db) {
    try {
      const q = query(collection(db, 'students'), orderBy('name', 'asc'));
      return onSnapshot(q, (snapshot) => {
        const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        callback(students);
      });
    } catch (e) {
      console.error("Subscribe Students Error", e);
      return () => {};
    }
  } else {
    const loadLocal = () => {
      const localData = localStorage.getItem('biblio_students_local');
      callback(localData ? JSON.parse(localData) : []);
    };
    loadLocal();
    localStudentListeners.push(callback);
    const handler = (e: StorageEvent) => { if (e.key === 'biblio_students_local') loadLocal(); };
    window.addEventListener('storage', handler);
    return () => {
      const idx = localStudentListeners.indexOf(callback);
      if (idx > -1) localStudentListeners.splice(idx, 1);
      window.removeEventListener('storage', handler);
    };
  }
};

export const addStudent = async (student: Omit<Student, 'id'>) => {
  if (isCloudEnabled && db) {
    await addDoc(collection(db, 'students'), student);
  } else {
    const localData = localStorage.getItem('biblio_students_local');
    const students: Student[] = localData ? JSON.parse(localData) : [];
    const newStudent = { ...student, id: Math.random().toString(36).substr(2, 9) };
    localStorage.setItem('biblio_students_local', JSON.stringify([newStudent, ...students]));
    notifyLocalStudents();
  }
};

export const addStudentsBatch = async (students: Omit<Student, 'id'>[]) => {
  if (isCloudEnabled && db) {
    const batch = writeBatch(db);
    students.forEach(s => {
      const docRef = doc(collection(db, 'students'));
      batch.set(docRef, s);
    });
    await batch.commit();
  } else {
    const localData = localStorage.getItem('biblio_students_local');
    const currentStudents: Student[] = localData ? JSON.parse(localData) : [];
    const newStudents = students.map(s => ({ ...s, id: Math.random().toString(36).substr(2, 9) }));
    localStorage.setItem('biblio_students_local', JSON.stringify([...newStudents, ...currentStudents]));
    notifyLocalStudents();
  }
};

export const deleteStudent = async (id: string) => {
  if (isCloudEnabled && db) {
    await deleteDoc(doc(db, 'students', id));
  } else {
    const localData = localStorage.getItem('biblio_students_local');
    if (localData) {
      const students: Student[] = JSON.parse(localData);
      const updated = students.filter(s => s.id !== id);
      localStorage.setItem('biblio_students_local', JSON.stringify(updated));
      notifyLocalStudents();
    }
  }
};
