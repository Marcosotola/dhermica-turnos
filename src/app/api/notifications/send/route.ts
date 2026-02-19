import { NextRequest, NextResponse } from 'next/server';
import { adminMessaging, adminDb } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';
import { createNotificationRecord } from '@/lib/firebase/notifications';

export async function POST(req: NextRequest) {
    try {
        const { title, body, targetUserId, tokens, sentBy, type, url } = await req.json();

        if (!tokens || tokens.length === 0) {
            return NextResponse.json({ error: 'No tokens provided' }, { status: 400 });
        }

        const message = {
            notification: {
                title,
                body,
            },
            data: {
                url: url || '/',
            },
            webpush: {
                notification: {
                    icon: '/icon.svg',
                    badge: '/icon.svg',
                    data: {
                        url: url || '/',
                    }
                },
                fcmOptions: {
                    link: url || '/'
                }
            },
            tokens: tokens,
        };

        const response = await adminMessaging.sendEachForMulticast(message);

        console.log('FCM SERVER: Send attempt finished.');
        console.log(`FCM SERVER: Success: ${response.successCount}, Failure: ${response.failureCount}`);

        // Cleanup invalid tokens if we have a targetUserId
        if (response.failureCount > 0 && targetUserId) {
            const tokensToRemove: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const error = resp.error as any;
                    // NotRegistered and InvalidRegistration are the standard errors for stale tokens
                    if (error?.code === 'messaging/registration-token-not-registered' ||
                        error?.code === 'messaging/invalid-registration-token') {
                        tokensToRemove.push(tokens[idx]);
                    }
                    console.error(`FCM SERVER: Token ${idx} failure:`, error);
                }
            });

            if (tokensToRemove.length > 0) {
                console.log(`FCM SERVER: Cleaning up ${tokensToRemove.length} invalid tokens for user ${targetUserId}`);
                try {
                    const userRef = adminDb.collection('users').doc(targetUserId);
                    await userRef.update({
                        fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove)
                    });
                    console.log('FCM SERVER: Token cleanup successful');
                } catch (cleanupError) {
                    console.error('FCM SERVER: Error during token cleanup:', cleanupError);
                }
            }
        }

        // Record the notification in Firestore
        await createNotificationRecord({
            title,
            body,
            sentBy,
            type,
            targetUserId: type === 'targeted' ? targetUserId : undefined,
        });

        return NextResponse.json({
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount,
        });
    } catch (error: any) {
        console.error('FCM SERVER ERROR:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
