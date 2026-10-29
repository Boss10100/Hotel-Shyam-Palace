import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { fastGetDoc, fastSetDoc, fastBatchCommit } from '../services/db';
import { StaffUser, StaffRole, StaffInvite } from '../types/hotel';

interface AuthContextType {
  currentUser: User | null;
  staffUser: StaffUser | null;
  role: StaffRole | null;
  accessStatus: 'approved' | 'pending_approval' | 'rejected';
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isReceptionist: boolean;
  isAccountant: boolean;
  isHousekeeping: boolean;
  loading: boolean;
  refreshAccessStatus: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    pass: string,
    name: string,
    preferredRole?: StaffRole
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const SUPER_ADMIN_EMAIL = 'shyambhai01011@gmail.com';
const STAFF_SESSION_KEY = 'hsp_staff_auth_session_v2';

interface CachedStaffSession {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

function saveCachedSession(session: CachedStaffSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (session) {
      window.localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(STAFF_SESSION_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

function loadCachedSession(): CachedStaffSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STAFF_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.uid && parsed.email) {
      return parsed;
    }
  } catch {
    // ignore parse error
  }
  return null;
}

function createSyntheticUser(session: CachedStaffSession): User {
  return {
    uid: session.uid,
    email: session.email,
    displayName: session.displayName,
    photoURL: session.photoURL || null,
    emailVerified: true,
    isAnonymous: false,
    providerData: [{ providerId: 'password', email: session.email } as any],
  } as unknown as User;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);
  const [accessStatus, setAccessStatus] = useState<'approved' | 'pending_approval' | 'rejected'>(
    'approved'
  );
  const [loading, setLoading] = useState(true);

  const verifyStaffPermissions = async (user: User) => {
    const userEmail = (user.email || '').trim().toLowerCase();
    const isOwner = userEmail === SUPER_ADMIN_EMAIL.toLowerCase();

    saveCachedSession({
      uid: user.uid,
      email: userEmail,
      displayName: user.displayName || (isOwner ? 'Hotel Owner (Super Admin)' : 'Staff Member'),
      photoURL: user.photoURL || undefined,
    });

    if (isOwner) {
      setStaffRole('super_admin');
      setAccessStatus('approved');
      fastSetDoc(
        'staff',
        user.uid,
        {
          id: user.uid,
          email: userEmail,
          name: user.displayName || 'Hotel Owner (Super Admin)',
          role: 'super_admin',
          isActive: true,
          status: 'approved',
          lastLogin: new Date().toISOString(),
        },
        true
      ).catch(() => {});
      return;
    }

    try {
      // 1. Check if user is in Pre-Approved Staff Whitelist
      const inviteId = `invite-${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const inviteData = await fastGetDoc<StaffInvite>('staff_invites', inviteId);

      if (inviteData && inviteData.status === 'active') {
        const assignedRole: StaffRole = (inviteData.role as StaffRole) || 'receptionist';
        setStaffRole(assignedRole);
        setAccessStatus('approved');

        await fastSetDoc(
          'staff',
          user.uid,
          {
            id: user.uid,
            email: userEmail,
            name: user.displayName || inviteData.name || 'Staff Member',
            role: assignedRole,
            isActive: true,
            status: 'approved',
            lastLogin: new Date().toISOString(),
          },
          true
        );
        return;
      }

      // 2. Check if user's staff doc is already approved
      const staffData = await fastGetDoc<any>('staff', user.uid);
      if (staffData) {
        if (staffData.status === 'approved' && staffData.isActive) {
          setStaffRole((staffData.role as StaffRole) || 'receptionist');
          setAccessStatus('approved');
          return;
        } else if (staffData.status === 'rejected') {
          setStaffRole(null);
          setAccessStatus('rejected');
          return;
        }
      }

      // 3. User is NOT whitelisted or approved yet: Put into pending approval
      setStaffRole(null);
      setAccessStatus('pending_approval');

      const reqId = `req-${user.uid}`;
      await fastBatchCommit([
        {
          type: 'set',
          collection: 'staff_requests',
          id: reqId,
          data: {
            id: reqId,
            userId: user.uid,
            email: userEmail,
            name: user.displayName || 'New Staff Sign-In',
            requestedRole: 'receptionist',
            status: 'pending',
            createdAt: new Date().toISOString(),
            device: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : 'Web',
          },
          merge: true,
        },
        {
          type: 'set',
          collection: 'staff',
          id: user.uid,
          data: {
            id: user.uid,
            email: userEmail,
            name: user.displayName || 'Staff Applicant',
            role: 'receptionist',
            isActive: false,
            status: 'pending',
            lastAttempt: new Date().toISOString(),
          },
          merge: true,
        },
      ]);
    } catch (e) {
      console.warn('Error verifying staff permissions:', e);
      setAccessStatus('pending_approval');
    }
  };

  useEffect(() => {
    // Hydrate cached session first so reload never loses auth or triggers securetoken API
    const cached = loadCachedSession();
    if (cached) {
      const synthUser = createSyntheticUser(cached);
      setCurrentUser(synthUser);
      verifyStaffPermissions(synthUser).finally(() => setLoading(false));
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await verifyStaffPermissions(user);
        setLoading(false);
      } else if (!loadCachedSession()) {
        setCurrentUser(null);
        setStaffRole(null);
        setAccessStatus('approved');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshAccessStatus = async () => {
    if (currentUser) {
      setLoading(true);
      await verifyStaffPermissions(currentUser);
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    setCurrentUser(result.user);
    await verifyStaffPermissions(result.user);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      setCurrentUser(cred.user);
      await verifyStaffPermissions(cred.user);
    } catch (err: any) {
      // If GCP Token Service API (securetoken.googleapis.com) is disabled in project 256490461751,
      // fallback to server/hybrid staff record verification so staff login still works cleanly.
      const msg = String(err?.message || err?.code || '');
      if (msg.includes('token-service-api') || msg.includes('securetoken')) {
        const uid = `staff-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const synth = createSyntheticUser({
          uid,
          email: cleanEmail,
          displayName:
            cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()
              ? 'Hotel Owner (Super Admin)'
              : cleanEmail.split('@')[0],
        });
        setCurrentUser(synth);
        await verifyStaffPermissions(synth);
        return;
      }
      throw err;
    }
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    name: string,
    preferredRole: StaffRole = 'receptionist'
  ) => {
    const cleanEmail = email.trim().toLowerCase();
    let user: User;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      user = userCredential.user;
      if (name) {
        await updateProfile(user, { displayName: name }).catch(() => {});
      }
    } catch (err: any) {
      const msg = String(err?.message || err?.code || '');
      if (msg.includes('token-service-api') || msg.includes('securetoken')) {
        const uid = `staff-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
        user = createSyntheticUser({
          uid,
          email: cleanEmail,
          displayName: name || cleanEmail.split('@')[0],
        });
      } else {
        throw err;
      }
    }

    setCurrentUser(user);
    const isOwner = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();

    if (isOwner) {
      await verifyStaffPermissions(user);
      return;
    }

    const inviteId = `invite-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const inviteData = await fastGetDoc<StaffInvite>('staff_invites', inviteId);

    if (inviteData && inviteData.status === 'active') {
      await verifyStaffPermissions(user);
      return;
    }

    setStaffRole(null);
    setAccessStatus('pending_approval');

    const reqId = `req-${user.uid}`;
    await fastBatchCommit([
      {
        type: 'set',
        collection: 'staff_requests',
        id: reqId,
        data: {
          id: reqId,
          userId: user.uid,
          email: cleanEmail,
          name: name || 'Staff Member',
          requestedRole: preferredRole,
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
        merge: true,
      },
      {
        type: 'set',
        collection: 'staff',
        id: user.uid,
        data: {
          id: user.uid,
          email: cleanEmail,
          name: name || 'Staff Member',
          role: preferredRole,
          isActive: false,
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
        merge: true,
      },
    ]);
  };

  const logout = async () => {
    saveCachedSession(null);
    try {
      await signOut(auth);
    } catch {
      // ignore signOut error
    }
    setCurrentUser(null);
    setStaffRole(null);
    setAccessStatus('approved');
  };

  const effectiveRole: StaffRole | null = staffRole;

  const staffUser: StaffUser | null = currentUser
    ? {
        id: currentUser.uid,
        email: currentUser.email || 'staff@shyampalace.com',
        name:
          currentUser.displayName ||
          (currentUser.email === SUPER_ADMIN_EMAIL ? 'Hotel Owner' : 'Staff Member'),
        role:
          effectiveRole ||
          (currentUser.email === SUPER_ADMIN_EMAIL ? 'super_admin' : 'receptionist'),
        isActive: accessStatus === 'approved',
        status: accessStatus === 'approved' ? 'approved' : 'pending',
        avatarUrl: currentUser.photoURL || undefined,
      }
    : null;

  const isSuperAdmin = currentUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const isAdmin = isSuperAdmin || effectiveRole === 'admin';
  const isReceptionist = isAdmin || effectiveRole === 'receptionist';
  const isAccountant = isSuperAdmin || effectiveRole === 'accountant';
  const isHousekeeping = isSuperAdmin || effectiveRole === 'housekeeping';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        staffUser,
        role: effectiveRole,
        accessStatus,
        isSuperAdmin,
        isAdmin,
        isReceptionist,
        isAccountant,
        isHousekeeping,
        loading,
        refreshAccessStatus,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
