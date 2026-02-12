import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    User
} from 'firebase/auth';
import { auth } from './config';

const googleProvider = new GoogleAuthProvider();

export const loginWithEmail = (email: string, pass: string) =>
    signInWithEmailAndPassword(auth, email, pass);

export const registerWithEmail = (email: string, pass: string) =>
    createUserWithEmailAndPassword(auth, email, pass);

export const loginWithGoogle = () =>
    signInWithPopup(auth, googleProvider);

export const logout = () => signOut(auth);

export const resetPassword = (email: string) =>
    sendPasswordResetEmail(auth, email);

export const onAuthChange = (callback: (user: User | null) => void) =>
    onAuthStateChanged(auth, callback);
