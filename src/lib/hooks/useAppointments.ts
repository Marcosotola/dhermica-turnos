import { useState, useEffect } from 'react';
import { Appointment } from '@/lib/types/appointment';
import { Professional } from '@/lib/types/professional';
import { subscribeToAppointmentsByDate } from '@/lib/firebase/appointments';

export function useAppointments(date: string, professionals: Professional[]) {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!date) {
            setAppointments([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const unsubscribe = subscribeToAppointmentsByDate(date, professionals, (data) => {
            setAppointments(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [date, professionals]);

    return { appointments, loading, error };
}
