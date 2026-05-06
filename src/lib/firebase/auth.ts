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
 * Singleton reCAPTCHA verifier — avoids recreating on the same container
 * which causes auth/invalid-app-credential errors.
 */
let recaptchaVerifierInstance: RecaptchaVerifier | null = null;

export const setupRecaptcha = (containerId: string): RecaptchaVerifier => {
    // Clear any existing instance before creating a new one
    if (recaptchaVerifierInstance) {
        try {
            recaptchaVerifierInstance.clear();
        } catch (_) { /* ignore */ }
        recaptchaVerifierInstance = null;
    }

    // Also clear the container DOM to avoid Firebase reuse errors
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';

    recaptchaVerifierInstance = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
            // reCAPTCHA solved
        },
        'expired-callback': () => {
            // Token expired — will be cleared on next call
            recaptchaVerifierInstance = null;
        },
    });

    return recaptchaVerifierInstance;
};

/**
 * Sign in with phone number
 */
export const signInWithPhone = (phoneNumber: string, appVerifier: any): Promise<ConfirmationResult> =>
    signInWithPhoneNumber(auth, phoneNumber, appVerifier);
