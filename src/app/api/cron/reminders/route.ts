import { NextRequest, NextResponse } from 'next/server';
import { checkAndSendReminders } from '@/lib/firebase/reminders';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // Check for authorization (optional but recommended)
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[Cron] Triggering reminders check...');
        const results = await checkAndSendReminders();

        return NextResponse.json({
            success: true,
            message: 'Reminders processed successfully',
            results
        });
    } catch (error: any) {
        console.error('[Cron] Error in reminders route:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

// Also allow POST if needed by some cron providers
export async function POST(req: NextRequest) {
    return GET(req);
}
