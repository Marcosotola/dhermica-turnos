import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from './admin';

export interface AuthenticatedUser {
    uid: string;
    role?: string;
}

/**
 * Verifica el ID token de Firebase mandado en el header Authorization: Bearer <token>.
 * Devuelve null si falta, es inválido o expiró.
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<AuthenticatedUser | null> {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;

    try {
        const decoded = await adminAuth.verifyIdToken(token);
        return { uid: decoded.uid };
    } catch {
        return null;
    }
}

/**
 * Igual que getAuthenticatedUser, pero además exige que el rol del usuario
 * (guardado en Firestore users/{uid}.role) esté dentro de allowedRoles.
 */
export async function requireRole(req: NextRequest, allowedRoles: string[]): Promise<AuthenticatedUser | null> {
    const authed = await getAuthenticatedUser(req);
    if (!authed) return null;

    const userSnap = await adminDb.collection('users').doc(authed.uid).get();
    const role = userSnap.exists ? (userSnap.data()?.role as string | undefined) : undefined;
    if (!role || !allowedRoles.includes(role)) return null;

    return { uid: authed.uid, role };
}
