import { User, AuditEvent, SystemConfiguration } from '../../types';
import { generateSalt, hashPassword } from '../security/cryptoUtils';

const DB_NAME = 'PensionCompliancePrototypeDB';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;
const memoryStore = {
  users: new Map<string, User>(),
  sessions: new Map<string, { sessionId: string; userId: string; expiresAt: number }>(),
};

/**
 * Initializes and opens IndexedDB with fallback to memory storage
 */
export async function getDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null;
  }

  if (dbInstance) return dbInstance;

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('email', 'email', { unique: true });
        }
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'sessionId' });
          sessionStore.createIndex('userId', 'userId', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        resolve(dbInstance);
      };

      request.onerror = () => {
        console.warn('IndexedDB failed to open. Falling back to in-memory prototype persistence.');
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB exception. Falling back to memory storage:', err);
      resolve(null);
    }
  });
}

/**
 * Seeds initial bootstrap accounts into IndexedDB / memory store if empty
 */
export async function seedInitialAccountsIfEmpty(): Promise<void> {
  const users = await getAllUsersFromDB();
  if (users.length > 0) return;

  // 1. Initial System Administrator (Provisioned via controlled bootstrap)
  const adminSalt = generateSalt();
  const adminHash = await hashPassword('Admin@2026!Zm', adminSalt);
  const initialAdmin: User = {
    id: 'USR-ADMIN-001',
    name: 'Chileshe Banda',
    email: 'admin@pension.gov.zm',
    role: 'SYSTEM_ADMINISTRATOR',
    department: 'Information Systems & Security Administration',
    status: 'ACTIVE',
    createdAt: '2026-10-20T08:00:00+02:00',
    lastLogin: null,
    passwordHash: adminHash,
    passwordSalt: adminSalt,
  };

  // 2. Initial Compliance Monitor
  const monitorSalt = generateSalt();
  const monitorHash = await hashPassword('Monitor@2026!Zm', monitorSalt);
  const initialMonitor: User = {
    id: 'USR-MON-001',
    name: 'Kondwani Phiri',
    email: 'monitor@pension.gov.zm',
    role: 'COMPLIANCE_MONITOR',
    department: 'Employer Audit & Compliance Inspection Unit',
    status: 'ACTIVE',
    createdAt: '2026-10-21T09:00:00+02:00',
    lastLogin: null,
    passwordHash: monitorHash,
    passwordSalt: monitorSalt,
  };

  await saveUserToDB(initialAdmin);
  await saveUserToDB(initialMonitor);
}

/**
 * Retrieves all users from IndexedDB or memory store
 */
export async function getAllUsersFromDB(): Promise<User[]> {
  const db = await getDB();
  if (!db) {
    return Array.from(memoryStore.users.values());
  }

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction('users', 'readonly');
      const store = transaction.objectStore('users');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve(Array.from(memoryStore.users.values()));
    } catch {
      resolve(Array.from(memoryStore.users.values()));
    }
  });
}

/**
 * Retrieves a user by their email address
 */
export async function getUserByEmailFromDB(email: string): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const db = await getDB();

  if (!db) {
    for (const user of memoryStore.users.values()) {
      if (user.email.toLowerCase() === normalizedEmail) return user;
    }
    return null;
  }

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction('users', 'readonly');
      const store = transaction.objectStore('users');
      const index = store.index('email');
      const request = index.get(normalizedEmail);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Retrieves a user by their ID
 */
export async function getUserByIdFromDB(id: string): Promise<User | null> {
  const db = await getDB();
  if (!db) {
    return memoryStore.users.get(id) || null;
  }

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction('users', 'readonly');
      const store = transaction.objectStore('users');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Saves a new user or updates an existing one
 */
export async function saveUserToDB(user: User): Promise<User> {
  const db = await getDB();
  const normalizedUser: User = {
    ...user,
    email: user.email.trim().toLowerCase(),
  };

  memoryStore.users.set(normalizedUser.id, normalizedUser);

  if (!db) return normalizedUser;

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction('users', 'readwrite');
      const store = transaction.objectStore('users');
      const request = store.put(normalizedUser);

      request.onsuccess = () => resolve(normalizedUser);
      request.onerror = (e) => reject(e);
    } catch (err) {
      resolve(normalizedUser);
    }
  });
}

/**
 * Session storage in IndexedDB / memory
 */
export async function saveSessionToDB(session: { sessionId: string; userId: string; expiresAt: number }): Promise<void> {
  const db = await getDB();
  memoryStore.sessions.set(session.sessionId, session);
  if (!db) return;

  try {
    const transaction = db.transaction('sessions', 'readwrite');
    const store = transaction.objectStore('sessions');
    store.put(session);
  } catch (err) {
    // Memory store already holds it
  }
}

export async function getSessionFromDB(
  sessionId: string
): Promise<{ sessionId: string; userId: string; expiresAt: number } | null> {
  const db = await getDB();
  if (!db) {
    return memoryStore.sessions.get(sessionId) || null;
  }

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction('sessions', 'readonly');
      const store = transaction.objectStore('sessions');
      const request = store.get(sessionId);

      request.onsuccess = () => resolve(request.result || memoryStore.sessions.get(sessionId) || null);
      request.onerror = () => resolve(memoryStore.sessions.get(sessionId) || null);
    } catch {
      resolve(memoryStore.sessions.get(sessionId) || null);
    }
  });
}

export async function clearSessionFromDB(sessionId: string): Promise<void> {
  const db = await getDB();
  memoryStore.sessions.delete(sessionId);
  if (!db) return;

  try {
    const transaction = db.transaction('sessions', 'readwrite');
    const store = transaction.objectStore('sessions');
    store.delete(sessionId);
  } catch (err) {
    // Memory deleted
  }
}
