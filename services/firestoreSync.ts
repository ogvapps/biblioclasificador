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
let _auth: any = null;        // Firebase Auth instance
let _isReady = false;

// Cloud role of the signed-in Firebase account (users/{uid}.role).
// firestore.rules enforce the same roles server-side; this only avoids
// sending writes that the rules would reject anyway.
export type CloudRole = 'ADMIN' | 'ASSISTANT' | null;
let _cloudRole: CloudRole = null;
let _cloudEmail: string | null = null;
let _resolveAuthReady: () => void = () => {};
const _authReady = new Promise<void>(resolve => { _resolveAuthReady = resolve; });
const _roleListeners = new Set<(role: CloudRole, email: string | null) => void>();

const notifyRole = () => _roleListeners.forEach(fn => fn(_cloudRole, _cloudEmail));

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
    const { getAuth, onAuthStateChanged } = await import('firebase/auth');

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

    // Firebase Auth persists the session, so a signed-in device keeps syncing
    // after reloads and while offline.
    _auth = getAuth(app);
    onAuthStateChanged(_auth, async (user: any) => {
      _cloudEmail = user?.email || null;
      _cloudRole = user ? await fetchRole(user.uid) : null;
      notifyRole();
      _resolveAuthReady();
    });

    _isReady = true;
    console.info('[Firestore] Conexión establecida con proyecto:', config.projectId);
    return true;
  } catch (err) {
    console.error('[Firestore] Error al inicializar:', err);
    _isReady = false;
    return false;
  }
}

// ─── Cloud account (Firebase Auth) ────────────────────────────────────────────

async function fetchRole(uid: string): Promise<CloudRole> {
  const cacheKey = `biblio_cloud_role_${uid}`;
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(_db, 'users', uid));
    const raw = snap.exists() ? snap.data().role : null;
    const role: CloudRole = raw === 'ADMIN' || raw === 'ASSISTANT' ? raw : null;
    if (role) localStorage.setItem(cacheKey, role);
    else localStorage.removeItem(cacheKey);
    return role;
  } catch (err) {
    // Offline: reuse the last known role so queued writes keep syncing.
    // The rules re-check the real role on the server, so this can't escalate.
    console.warn('[Firestore] No se pudo leer el rol de la cuenta:', err);
    const cached = localStorage.getItem(cacheKey);
    return cached === 'ADMIN' || cached === 'ASSISTANT' ? cached : null;
  }
}

export function getCloudRole(): CloudRole {
  return _cloudRole;
}

export function getCloudEmail(): string | null {
  return _cloudEmail;
}

export function subscribeToCloudRole(cb: (role: CloudRole, email: string | null) => void): () => void {
  _roleListeners.add(cb);
  cb(_cloudRole, _cloudEmail);
  return () => { _roleListeners.delete(cb); };
}

/** Resolves once Firebase Auth has restored (or not) the persisted session. */
export async function waitForCloudAuth(): Promise<void> {
  if (!_isReady) return;
  await _authReady;
}

export async function signInCloud(email: string, password: string): Promise<CloudRole> {
  if (!_isReady || !_auth) throw new Error('Primero configura y conecta Firebase.');
  const { signInWithEmailAndPassword, signOut } = await import('firebase/auth');
  const { user } = await signInWithEmailAndPassword(_auth, email, password);
  const role = await fetchRole(user.uid);
  if (!role) {
    await signOut(_auth);
    throw new Error('Esta cuenta no tiene permisos de bibliotecario (falta users/{uid} con role).');
  }
  _cloudRole = role;
  _cloudEmail = user.email;
  notifyRole();
  return role;
}

export async function signOutCloud(): Promise<void> {
  if (!_auth) return;
  const { signOut } = await import('firebase/auth');
  await signOut(_auth);
}

export async function getCloudIdToken(): Promise<string | null> {
  return _auth?.currentUser ? _auth.currentUser.getIdToken() : null;
}

const isCloudStaff = () => _cloudRole === 'ADMIN' || _cloudRole === 'ASSISTANT';
const isCloudAdmin = () => _cloudRole === 'ADMIN';

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
  await waitForCloudAuth();
  if (!isCloudAdmin()) throw new Error('Para subir datos a la nube inicia sesión con una cuenta de administrador en Ajustes.');

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
  await waitForCloudAuth();

  const { collection, getDocs } = await import('firebase/firestore');

  const fetchCollection = async <T>(name: string): Promise<T[]> => {
    const snap = await getDocs(collection(_db, name));
    return snap.docs.map(d => ({ ...d.data() } as T));
  };

  // The catalog is public; loans and students (personal data) need a staff account
  const staff = isCloudStaff();
  const [books, loans, students] = await Promise.all([
    fetchCollection<Book>('books'),
    staff ? fetchCollection<Loan>('loans') : Promise.resolve([] as Loan[]),
    staff ? fetchCollection<Student>('students') : Promise.resolve([] as Student[]),
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
  if (!_isReady || !_db || !isCloudStaff()) return;
  const { collection, doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(collection(_db, 'books'), book.id), sanitizeForFirestore(book));
}

/**
 * Deletes a book document from Firestore.
 */
export async function deleteBookFromFirestore(bookId: string): Promise<void> {
  if (!_isReady || !_db || !isCloudAdmin()) return;
  const { collection, doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(collection(_db, 'books'), bookId));
}

/**
 * Saves a single loan document to Firestore.
 */
export async function syncLoanToFirestore(loan: Loan): Promise<void> {
  if (!_isReady || !_db || !isCloudStaff()) return;
  const { collection, doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(collection(_db, 'loans'), loan.id), sanitizeForFirestore(loan));
}

/**
 * Saves a single student document to Firestore.
 */
export async function syncStudentToFirestore(student: Student): Promise<void> {
  if (!_isReady || !_db || !isCloudAdmin()) return;
  const { collection, doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(collection(_db, 'students'), student.id), sanitizeForFirestore(student));
}

/**
 * Deletes a student document from Firestore.
 */
export async function deleteStudentFromFirestore(studentId: string): Promise<void> {
  if (!_isReady || !_db || !isCloudAdmin()) return;
  const { collection, doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(collection(_db, 'students'), studentId));
}
