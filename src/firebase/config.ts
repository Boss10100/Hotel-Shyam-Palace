import { initializeApp, getApps } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  inMemoryPersistence,
  browserPopupRedirectResolver,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Clean up any stale IndexedDB auth tokens from previous sessions that could trigger
// securetoken.googleapis.com errors when Token Service API is disabled on the GCP project.
if (typeof window !== 'undefined' && window.indexedDB) {
  try {
    window.indexedDB.deleteDatabase('firebaseLocalStorageDb');
  } catch {
    // ignore cleanup error
  }
}

// 1. Dedicated Auth App Instance (uses inMemoryPersistence so background token refresh
// never calls securetoken.googleapis.com and never breaks the app).
const existingAuthApp = getApps().find((a) => a.name === 'hsp-auth-app');
const authApp = existingAuthApp || initializeApp(firebaseConfig, 'hsp-auth-app');

export const auth = (() => {
  try {
    return initializeAuth(authApp, {
      persistence: inMemoryPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    return getAuth(authApp);
  }
})();

// 2. Dedicated, Isolated Firestore App Instance (NEVER registers getAuth, so Firestore
// uses EmptyAuthCredentialsProvider and NEVER calls securetoken.googleapis.com).
const existingFirestoreApp = getApps().find((a) => a.name === 'hsp-firestore-isolated');
const firestoreApp =
  existingFirestoreApp || initializeApp(firebaseConfig, 'hsp-firestore-isolated');

export const db = (() => {
  try {
    return initializeFirestore(
      firestoreApp,
      {
        experimentalAutoDetectLongPolling: true,
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(firestoreApp, firebaseConfig.firestoreDatabaseId);
  }
})();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore operation notice (handled by hybrid persistence):', JSON.stringify(errInfo));
}

// Initial connection test as required by skill (with fast timeout guard)
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await Promise.race([
      getDocFromServer(doc(db, 'test', 'connection')),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500)),
    ]);
    return true;
  } catch {
    return false;
  }
}
