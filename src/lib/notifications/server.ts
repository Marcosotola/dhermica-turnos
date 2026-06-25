import { adminDb, adminMessaging } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';

/**
 * Sends an FCM push notification from server-side (API routes).
 * Uses the admin SDK directly instead of calling the /api/notifications/send endpoint.
 */
export async function sendServerFCMNotification({
    clientId,
    title,
    body,
    url = '/mis-turnos',
}: {
    clientId: string;
    title: string;
    body: string;
    url?: string;
}) {
    try {
        const userDoc = await adminDb.collection('users').doc(clientId).get();
        const userData = userDoc.data();

        if (!userData || !userData.fcmTokens || userData.fcmTokens.length === 0 || userData.notificationsEnabled === false) {
            return;
        }

        const message = {
            notification: { title, body },
            data: { url },
            webpush: {
                notification: {
                    icon: '/icon.svg',
                    badge: '/icon.svg',
                    data: { url },
                },
                fcmOptions: { link: url },
            },
            tokens: userData.fcmTokens,
        };

        const response = await adminMessaging.sendEachForMulticast(message);

        if (response.failureCount > 0) {
            const tokensToRemove: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const error = resp.error as any;
                    if (error?.code === 'messaging/registration-token-not-registered' ||
                        error?.code === 'messaging/invalid-registration-token') {
                        tokensToRemove.push(userData.fcmTokens[idx]);
                    }
                }
            });
            if (tokensToRemove.length > 0) {
                await adminDb.collection('users').doc(clientId).update({
                    fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
                });
            }
        }

        await adminDb.collection('notifications').add({
            title,
            body,
            targetUserId: clientId,
            targetUserName: userData.fullName || '',
            sentBy: 'system',
            type: 'targeted',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            url,
        });

        console.log(`[ServerNotif] FCM sent to ${clientId}: ${response.successCount} ok, ${response.failureCount} fail`);
    } catch (error) {
        console.error('[ServerNotif] Error sending FCM:', error);
    }
}

/**
 * Notifies n8n webhook from server-side when an online booking is confirmed.
 */
export async function notifyN8nFromServer({
    appointmentId,
    clientName,
    clientPhone,
    clientEmail,
    treatment,
    date,
    time,
    duration,
    price,
    depositAmount,
    professionalId,
}: {
    appointmentId: string;
    clientName: string;
    clientPhone?: string;
    clientEmail?: string;
    treatment: string;
    date: string;
    time: string;
    duration?: number;
    price?: number;
    depositAmount?: number;
    professionalId?: string;
}) {
    const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
        const [year, month, day] = (date || '').split('-');
        const formattedDate = day && month && year ? `${day}/${month}/${year}` : date;

        let professionalName = '';
        if (professionalId) {
            const profSnap = await adminDb.collection('professionals').doc(professionalId).get();
            if (profSnap.exists) professionalName = profSnap.data()?.name || '';
        }

        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event: 'appointment_created',
                appointmentId,
                client: {
                    name: clientName,
                    phone: clientPhone || null,
                    email: clientEmail || null,
                },
                appointment: {
                    treatment,
                    date,
                    dateFormatted: formattedDate,
                    time,
                    duration: duration || 0,
                    price: price || 0,
                    totalPaid: depositAmount || 0,
                    balance: (price || 0) - (depositAmount || 0),
                    status: 'pending',
                },
                professional: {
                    id: professionalId || null,
                    name: professionalName || null,
                },
                source: 'online_booking',
                createdAt: new Date().toISOString(),
            }),
        });
        console.log('[ServerNotif] n8n webhook notified');
    } catch (error) {
        console.error('[ServerNotif] n8n webhook error (non-blocking):', error);
    }
}
