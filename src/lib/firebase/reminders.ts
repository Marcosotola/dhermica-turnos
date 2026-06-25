import { adminDb, adminMessaging } from './admin';
import * as admin from 'firebase-admin';

/**
 * Checks for upcoming appointments and sends reminder notifications.
 * Should be called periodically (e.g., every 15-30 minutes).
 */
export async function checkAndSendReminders() {
    console.log('[Reminders] Starting check...');
    const now = new Date();

    // We'll look for appointments in the next 3 days to be safe
    const searchLimit = new Date();
    searchLimit.setDate(now.getDate() + 3);
    const searchLimitStr = searchLimit.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    try {
        const appointmentsSnap = await adminDb.collection('appointments')
            .where('date', '>=', todayStr)
            .where('date', '<=', searchLimitStr)
            .get();

        console.log(`[Reminders] Found ${appointmentsSnap.size} upcoming appointments for checking.`);

        const results = {
            notified48h: 0,
            notified24h: 0,
            notified1h: 0,
            errors: 0
        };

        for (const appointmentDoc of appointmentsSnap.docs) {
            const appointment = appointmentDoc.data();
            const appointmentId = appointmentDoc.id;

            if (!appointment.clientId || appointment.status === 'cancelled' || appointment.status === 'cancelado') {
                continue;
            }

            // Parse appointment date and time
            const [year, month, day] = appointment.date.split('-').map(Number);
            const [hours, minutes] = appointment.time.split(':').map(Number);
            const appointmentDate = new Date(year, month - 1, day, hours, minutes);

            const diffMs = appointmentDate.getTime() - now.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);

            // 48h Reminder (within 48h before)
            if (diffHours > 24 && diffHours <= 48 && !appointment.notified48h) {
                await sendReminder(appointment, appointmentId, '48h');
                results.notified48h++;
            }
            // 24h Reminder (within 24h before)
            else if (diffHours > 0 && diffHours <= 24 && !appointment.notified24h) {
                await sendReminder(appointment, appointmentId, '24h');
                results.notified24h++;
            }
        }

        console.log('[Reminders] Check finished:', results);
        return results;
    } catch (error) {
        console.error('[Reminders] Error checking reminders:', error);
        throw error;
    }
}

async function sendReminder(appointment: any, appointmentId: string, type: '48h' | '24h' | '1h') {
    const { clientId, clientName, treatment, date, time } = appointment;
    const [year, month, day] = date.split('-');
    const formattedDate = `${day}-${month}-${year}`;

    let title = '';
    let body = '';
    const flagField = `notified${type}`;

    switch (type) {
        case '48h':
            title = 'Dhermica: Recordatorio de Turno (48hs) 🗓️';
            body = `Hola ${clientName}, te recordamos tu turno para ${treatment} el ${formattedDate} a las ${time}. ¡Te esperamos!`;
            break;
        case '24h':
            title = 'Dhermica: Tu turno es mañana ⏰';
            body = `Te recordamos que tienes un turno mañana ${formattedDate} a las ${time} para ${treatment}.`;
            break;
        case '1h':
            title = 'Dhermica: ¡Tu turno comienza en 1 hora! 🚀';
            body = `¡Hola! Te recordamos que en una hora (${time}) tienes tu cita para ${treatment}. ¡Nos vemos pronto!`;
            break;
    }

    try {
        // Get client tokens
        const userDoc = await adminDb.collection('users').doc(clientId).get();
        const userData = userDoc.data();

        if (!userData || !userData.fcmTokens || userData.fcmTokens.length === 0 || userData.notificationsEnabled === false) {
            console.log(`[Reminders] Skipping ${type} for ${clientName} (No tokens or notifications disabled)`);
            // Mark as notified anyway so we don't keep trying if they haven't enabled notifications
            await adminDb.collection('appointments').doc(appointmentId).update({
                [flagField]: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return;
        }

        console.log(`[Reminders] Sending ${type} notification to ${clientName} (${userData.fcmTokens.length} tokens)`);

        const message = {
            notification: { title, body },
            data: { url: '/mis-turnos' },
            tokens: userData.fcmTokens,
        };

        const response = await adminMessaging.sendEachForMulticast(message);
        console.log(`[Reminders] ${type} sent: ${response.successCount} success, ${response.failureCount} failure`);

        // Update appointment flag
        await adminDb.collection('appointments').doc(appointmentId).update({
            [flagField]: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Record in history
        await adminDb.collection('notifications').add({
            title,
            body,
            targetUserId: clientId,
            targetUserName: clientName,
            sentBy: 'system',
            type: 'reminder',
            reminderType: type,
            appointmentId,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            url: '/mis-turnos'
        });

    } catch (error) {
        console.error(`[Reminders] Error sending ${type} reminder to ${clientName}:`, error);
    }
}
