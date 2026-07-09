import { getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";
import type { Profile, UserRole } from "@/lib/types";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

export const firebaseApp = isFirebaseConfigured
  ? (getApps()[0] ?? initializeApp(firebaseConfig))
  : null;

export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
export const firestore = firebaseApp ? getFirestore(firebaseApp) : null;

const ADMIN_EMAILS = new Set(["niyas.zealdesigner@gmail.com"]);

function ensureFirebase() {
  if (!firebaseAuth || !firestore) {
    throw new Error("Firebase is not configured. Add the VITE_FIREBASE_* variables to your environment.");
  }
  return { auth: firebaseAuth, db: firestore };
}

function normalizeRole(value?: unknown): UserRole {
  if (value === "super_admin" || value === "admin" || value === "manager" || value === "employee" || value === "customer" || value === "user") return value;
  return "employee";
}

function asIso(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return typeof value === "string" ? value : new Date().toISOString();
}

function mapProfile(id: string, data: Record<string, unknown>, user?: User): Profile {
  const email = String(data.email ?? user?.email ?? "");
  return {
    id,
    email,
    full_name: String(data.full_name ?? data.name ?? user?.displayName ?? email.split("@")[0] ?? "User"),
    role: normalizeRole(data.role),
    disabled: Boolean(data.disabled ?? false),
    credits: Number(data.credits ?? 0),
    created_at: asIso(data.created_at ?? user?.metadata.creationTime),
    updated_at: asIso(data.updated_at ?? user?.metadata.lastSignInTime)
  };
}

function fallbackProfileFromUser(user: User): Profile {
  const email = user.email ?? "";
  const name = user.displayName ?? email.split("@")[0] ?? "User";
  return {
    id: user.uid,
    email,
    full_name: name,
    role: ADMIN_EMAILS.has(email.toLowerCase()) ? "super_admin" : "employee",
    disabled: false,
    credits: 0,
    created_at: user.metadata.creationTime ?? new Date().toISOString(),
    updated_at: user.metadata.lastSignInTime ?? new Date().toISOString()
  };
}

function isRecoverableFirestoreError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    code === "unavailable" ||
    code === "deadline-exceeded" ||
    code === "failed-precondition" ||
    message.includes("client is offline") ||
    message.includes("network") ||
    message.includes("offline")
  );
}

export function firebaseAuthError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code === "auth/email-already-in-use") return "This email is already registered. Please sign in instead.";
  if (code === "auth/invalid-email") return "Enter a valid email address.";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") return "Invalid Email or Password.";
  if (code === "auth/weak-password") return "Password is too weak. Use at least 8 characters with letters, numbers, and symbols.";
  if (code === "auth/popup-closed-by-user") return "Google sign-in was closed before it finished.";
  if (code === "auth/popup-blocked") return "The sign-in popup was blocked. Allow popups and try again.";
  if (code === "auth/network-request-failed") return "Network error. Check your internet connection and try again.";
  if (code === "auth/too-many-requests") return "Too many attempts. Please wait a moment and try again.";
  if (code === "auth/unauthorized-domain") return "This domain is not authorized in Firebase Authentication settings.";
  if (code === "auth/operation-not-allowed") return "This sign-in method is not enabled in Firebase Console.";
  return error instanceof Error ? error.message : "Authentication failed. Please try again.";
}

export async function getOrCreateFirebaseProfile(user: User, provider = "password") {
  const { db } = ensureFirebase();
  const ref = doc(db, "users", user.uid);
  const email = user.email ?? "";
  const name = user.displayName ?? email.split("@")[0] ?? "User";
  const fallback = fallbackProfileFromUser(user);
  const baseData = {
    uid: user.uid,
    name,
    full_name: name,
    email,
    photo_url: user.photoURL ?? "",
    provider,
    last_login: serverTimestamp(),
    updated_at: serverTimestamp()
  };

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await setDoc(ref, baseData, { merge: true });
      return mapProfile(user.uid, snap.data(), user);
    }

    await setDoc(ref, {
      ...baseData,
      role: ADMIN_EMAILS.has(email.toLowerCase()) ? "super_admin" : "employee",
      disabled: false,
      credits: 0,
      created_at: serverTimestamp()
    });
    return fallback;
  } catch (error) {
    if (isRecoverableFirestoreError(error)) return fallback;
    throw error;
  }
}

export async function firebaseGetCurrentProfile() {
  const { auth } = ensureFirebase();
  const user = auth.currentUser;
  if (!user) return null;
  const profile = await getOrCreateFirebaseProfile(user, user.providerData[0]?.providerId ?? "password");
  return profile.disabled ? null : profile;
}

export async function firebaseSignIn(email: string, password: string, remember = true) {
  try {
    const { auth } = ensureFirebase();
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const profile = await getOrCreateFirebaseProfile(credential.user, "password");
    if (profile.disabled) {
      await firebaseSignOut(auth);
      throw new Error("This account has been disabled.");
    }
    return profile;
  } catch (error) {
    throw new Error(firebaseAuthError(error));
  }
}

export async function firebaseSignUp(email: string, password: string, fullName: string) {
  try {
    const { auth } = ensureFirebase();
    await setPersistence(auth, browserLocalPersistence);
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(credential.user, { displayName: fullName.trim() });
    await getOrCreateFirebaseProfile(credential.user, "password");
    await sendEmailVerification(credential.user);
  } catch (error) {
    throw new Error(firebaseAuthError(error));
  }
}

export async function firebaseGoogleSignIn(remember = true) {
  try {
    const { auth } = ensureFirebase();
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const credential = await signInWithPopup(auth, provider);
    const profile = await getOrCreateFirebaseProfile(credential.user, "google.com");
    if (profile.disabled) {
      await firebaseSignOut(auth);
      throw new Error("This account has been disabled.");
    }
    return profile;
  } catch (error) {
    throw new Error(firebaseAuthError(error));
  }
}

export async function firebaseResetPassword(email: string) {
  try {
    const { auth } = ensureFirebase();
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error) {
    throw new Error(firebaseAuthError(error));
  }
}

export async function firebaseLogout() {
  const { auth } = ensureFirebase();
  await firebaseSignOut(auth);
}

export function firebaseOnAuthChange(callback: (profile: Profile | null) => void) {
  if (!firebaseAuth) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(firebaseAuth, async (user) => {
    if (!user) {
      callback(null);
      return;
    }
    try {
      const profile = await getOrCreateFirebaseProfile(user, user.providerData[0]?.providerId ?? "password");
      callback(profile.disabled ? null : profile);
    } catch (error) {
      if (isRecoverableFirestoreError(error)) {
        callback(fallbackProfileFromUser(user));
        return;
      }
      callback(null);
    }
  });
}

export async function firebaseGetUsers() {
  const { db } = ensureFirebase();
  const snapshot = await getDocs(query(collection(db, "users"), orderBy("created_at", "desc")));
  return snapshot.docs.map((item) => mapProfile(item.id, item.data()));
}

export async function firebaseUpdateUserRole(userId: string, role: UserRole) {
  const { db } = ensureFirebase();
  await updateDoc(doc(db, "users", userId), { role, updated_at: serverTimestamp() });
}

export async function firebaseSetUserDisabled(userId: string, disabled: boolean) {
  const { db } = ensureFirebase();
  await updateDoc(doc(db, "users", userId), { disabled, updated_at: serverTimestamp() });
}
