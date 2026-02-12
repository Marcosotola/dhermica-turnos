'use client';

import { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { UserProfile } from '@/lib/types/user';
import { Button } from '@/components/ui/Button';
import { X, Gift } from 'lucide-react';

interface BirthdayModalProps {
    user: UserProfile;
}

export function BirthdayModal({ user }: BirthdayModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [confettiRecycle, setConfettiRecycle] = useState(true);
    // Simple window size hook implementation or we can assume full screen
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };

        // Initialize
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!user.birthDate) return;

        const checkBirthday = () => {
            const today = new Date();
            // birthDate is YYYY-MM-DD string. 
            // We want to compare strictly the numeric month and day components
            const [bYear, bMonth, bDay] = user.birthDate.split('-').map(Number);

            // today.getMonth() is 0-indexed (0=Jan, 11=Dec)
            // bMonth from parsing '2000-01-01' -> 1 (Jan)
            // So we compare today.getMonth() + 1 === bMonth

            if (today.getDate() === bDay && (today.getMonth() + 1) === bMonth) {
                // Check if we already showed it this year
                const currentYear = today.getFullYear().toString();
                const lastShown = localStorage.getItem(`birthday_shown_${user.uid}`);

                if (lastShown !== currentYear) {
                    setIsOpen(true);
                    localStorage.setItem(`birthday_shown_${user.uid}`, currentYear);

                    // Stop confetti after 7 seconds
                    setTimeout(() => {
                        setConfettiRecycle(false);
                    }, 7000);
                }
            }
        };

        checkBirthday();
    }, [user]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-500">
            {/* Confetti Layer */}
            <div className="fixed inset-0 pointer-events-none z-10">
                <Confetti
                    width={windowSize.width}
                    height={windowSize.height}
                    recycle={confettiRecycle}
                    numberOfPieces={500}
                    gravity={0.15}
                />
            </div>

            <div className="relative bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl text-center transform animate-in zoom-in-95 duration-500 z-20 overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#34baab]/20 to-transparent" />

                <div className="relative z-10">
                    <div className="w-20 h-20 bg-[#34baab] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg rotate-12 animate-bounce">
                        <Gift className="w-10 h-10 text-white" />
                    </div>

                    <h2 className="text-3xl font-black text-gray-900 mb-2">
                        ¡Feliz Cumpleaños!
                    </h2>
                    <h3 className="text-xl font-bold text-[#34baab] mb-6">
                        {user.fullName.split(' ')[0]}
                    </h3>

                    <p className="text-gray-600 mb-8 leading-relaxed">
                        Desde <span className="font-bold text-gray-900">Dhermica Estética Unisex</span> queremos desearte un día maravilloso lleno de alegría y momentos especiales.
                        <br />
                        <span className="block mt-4 text-sm font-medium text-gray-500">
                            ¡Gracias por elegirnos para cuidar de ti!
                        </span>
                    </p>

                    <Button
                        onClick={() => setIsOpen(false)}
                        className="w-full bg-[#34baab] hover:bg-[#2aa89a] text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                    >
                        ¡Muchas Gracías!
                    </Button>
                </div>
            </div>
        </div>
    );
}
