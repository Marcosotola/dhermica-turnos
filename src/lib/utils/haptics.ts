/**
 * Haptics utility for PWA experience
 */

export const haptics = {
    /**
     * Short light vibration for subtle feedback
     */
    light: () => {
        if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
            navigator.vibrate(10);
        }
    },

    /**
     * Medium vibration for successes or standard actions
     */
    medium: () => {
        if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
            navigator.vibrate(20);
        }
    },

    /**
     * A bit stronger vibration for important events or errors
     */
    impact: () => {
        if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
            navigator.vibrate([30, 50, 30]);
        }
    },

    /**
     * Success pattern (double pulse)
     */
    success: () => {
        if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
            navigator.vibrate([10, 30, 10]);
        }
    }
};
