import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        console.warn('Firebase Admin SDK missing credentials. Server-side features might not work.');
    } else {
        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey: privateKey.replace(/\\n/g, '\n'),
                }),
            });
        } catch (error) {
            console.error('Firebase admin initialization error:', error);
        }
    }
}

const getDb = () => {
    if (!admin.apps.length) return null;
    return admin.firestore();
};

const getAuth = () => {
    if (!admin.apps.length) return null;
    return admin.auth();
};

const getMessaging = () => {
    if (!admin.apps.length) return null;
    return admin.messaging();
};

export const adminDb = getDb()!;
export const adminAuth = getAuth()!;
export const adminMessaging = getMessaging()!;
