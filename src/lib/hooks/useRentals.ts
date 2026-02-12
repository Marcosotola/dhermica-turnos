import { useState, useEffect } from 'react';
import { Rental } from '../types/rental';
import { subscribeToRentals } from '../firebase/rentals';

export function useRentals() {
    const [rentals, setRentals] = useState<Rental[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeToRentals((data) => {
            setRentals(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { rentals, loading };
}
