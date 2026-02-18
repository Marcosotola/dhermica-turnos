import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

admin.initializeApp();

/**
 * Scheduled function to send appointment reminders
 * Runs every 30 minutes
 */
export const sendAppointmentReminders = onSchedule("every 30 minutes",
    async () => {
        const db = admin.firestore();
        const messaging = admin.messaging();

        // Get current time in Argentina (UTC-3)
        const now = new Date();
        const arTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));

        logger.info("Starting appointment reminder check", {
            timeUTC: now.toISOString(),
            timeAR: arTime.toISOString(),
        });

        const checkIntervals = [
            { hours: 1, flag: "notified1h", label: "en 1 hora" },
            { hours: 24, flag: "notified24h", label: "mañana" },
            { hours: 48, flag: "notified48h", label: "en 48 horas" },
        ];

        for (const interval of checkIntervals) {
            const targetTime = new Date(arTime.getTime() +
                (interval.hours * 60 * 60 * 1000));
            const targetDateStr = targetTime.toISOString().split("T")[0];
            const targetHour = targetTime.getHours();
            const targetMin = targetTime.getMinutes();

            const appointmentsQuery = db.collection("appointments")
                .where("date", "==", targetDateStr)
                .where(interval.flag, "==", false);

            const snapshot = await appointmentsQuery.get();

            for (const doc of snapshot.docs) {
                const apt = doc.data();
                const [aptH, aptM] = apt.time.split(":").map(Number);

                const aptTotalMins = (aptH * 60) + aptM;
                const targetTotalMins = (targetHour * 60) + targetMin;

                if (aptTotalMins >= targetTotalMins &&
                    aptTotalMins < targetTotalMins + 35) {
                    logger.info(`Sending ${interval.label} reminder for ${doc.id}`, {
                        client: apt.clientName,
                        time: apt.time,
                    });

                    if (apt.clientId) {
                        const userDoc = await db.collection("users")
                            .doc(apt.clientId).get();
                        const userData = userDoc.data();
                        const tokens = userData?.fcmTokens || [];

                        if (tokens.length > 0) {
                            const body = `Dhermica Estetica Unisex: Hola ${apt.clientName}, ` +
                                `recordatorio de turno para ${apt.treatment} ` +
                                `${interval.label} a las ${apt.time}hs.`;

                            const message = {
                                notification: {
                                    title: "Recordatorio de Turno",
                                    body: body,
                                },
                                tokens: tokens,
                            };

                            try {
                                const response = await messaging.sendEachForMulticast(message);
                                logger.info(`Reminders sent for ${doc.id}: ` +
                                    `${response.successCount} success`);

                                // Log to notifications history
                                await db.collection("notifications").add({
                                    title: "Recordatorio Automático",
                                    body: body,
                                    sentAt: admin.firestore.Timestamp.now(),
                                    sentBy: "system",
                                    type: "targeted",
                                    targetUserId: apt.clientId,
                                });
                            } catch (error) {
                                logger.error(`Error sending for ${doc.id}:`, error);
                            }
                        } else {
                            logger.warn(`No FCM tokens found for client ${apt.clientId}`);
                        }
                    }

                    // Mark as notified
                    const updateData: { [key: string]: boolean } = {};
                    updateData[interval.flag] = true;
                    await doc.ref.update(updateData);
                }
            }
        }
    });
