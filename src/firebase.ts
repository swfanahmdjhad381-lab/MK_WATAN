import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  await signInWithRedirect(auth, googleProvider);
};

export const loginWithUsername = async (username, password) => {
  const response = await fetch('/api/auth/login-username', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return await signInWithCustomToken(auth, data.token);
};

export const handleRedirectResult = async () => {
  const result = await getRedirectResult(auth);
  if (result) {
    const user = result.user;
    
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName || 'مستخدم جديد',
        email: user.email,
        photoURL: user.photoURL || '',
        role: 'user',
        isPremium: false,
        createdAt: serverTimestamp(),
      });
    }
    return result;
  }
  return null;
};

export const logout = () => signOut(auth);

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
