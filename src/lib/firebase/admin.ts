import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        // Falla clara e inmediata en vez de dejar adminDb/adminAuth/adminMessaging en null
        // disfrazados de no-null (con `!`) — eso producía un TypeError críptico recién en el
        // primer uso, en medio de código de Firestore, en vez de un mensaje claro acá.
        throw new Error(
            '[firebase/admin] Firebase Admin SDK no se pudo inicializar: faltan credenciales ' +
            '(FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). ' +
            'Las rutas de API que dependen del Admin SDK no van a funcionar sin esto.'
        );
    }

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
        throw error;
    }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminMessaging = admin.messaging();
