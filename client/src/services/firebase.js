import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_API_KEY !== 'YOUR_FIREBASE_API_KEY' &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID
);

let app = null;
let auth = null;
let googleProvider = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } catch {
    // Gracefully leave auth as null if initialization fails
  }
}

export const signInWithGoogle = async () => {
  if (!isFirebaseConfigured || !auth || !googleProvider) {
    throw new Error(
      'Firebase credentials are not configured yet. Please add your Firebase configuration to client/.env (VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, etc.).'
    );
  }

  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();

  return {
    email: result.user.email,
    displayName: result.user.displayName,
    photoURL: result.user.photoURL,
    uid: result.user.uid,
    idToken
  };
};

export const connectGmail = async () => {
  if (!isFirebaseConfigured || !auth) {
    throw new Error(
      'Firebase credentials are not configured yet. Please check your Firebase configuration in client/.env.'
    );
  }

  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
  provider.setCustomParameters({ prompt: 'consent' });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;

  if (!accessToken) {
    throw new Error(
      'Could not retrieve Google Access Token with Gmail permissions. Please ensure popups are allowed and consent was granted.'
    );
  }

  return {
    accessToken,
    email: result.user.email,
    displayName: result.user.displayName,
    photoURL: result.user.photoURL
  };
};

export { auth, googleProvider };
