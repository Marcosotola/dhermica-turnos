import { NextRequest, NextResponse } from 'next/server';
import { adminMessaging } from '@/lib/firebase/admin';
import { createNotificationRecord } from '@/lib/firebase/notifications';

export async function POST(req: NextRequest) {
    try {
        const { title, body, targetUserId, tokens, sentBy, type } = await req.json();

        if (!tokens || tokens.length === 0) {
            return NextResponse.json({ error: 'No tokens provided' }, { status: 400 });
        }

        const message = {
            notification: {
                title,
                body,
            },
            tokens: tokens,
        };

        const response = await adminMessaging.sendEachForMulticast(message);

        console.log('FCM SERVER: Send attempt finished.');
        console.log(`FCM SERVER: Success: ${response.successCount}, Failure: ${response.failureCount}`);

        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`FCM SERVER: Token ${idx} failure:`, resp.error);
                }
            });
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
