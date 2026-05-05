import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    User,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    ConfirmationResult
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

/**
 * Setup reCAPTCHA verifier for phone auth
 */
export const setupRecaptcha = (containerId: string) => {
    return new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: (response: any) => {
            // reCAPTCHA solved - will proceed with submitPhoneNumber
        },
        'expired-callback': () => {
            // Response expired. Ask user to solve reCAPTCHA again.
        }
    });
};

/**
 * Sign in with phone number
 */
export const signInWithPhone = (phoneNumber: string, appVerifier: any): Promise<ConfirmationResult> =>
    signInWithPhoneNumber(auth, phoneNumber, appVerifier);
